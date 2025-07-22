#!/usr/bin/env node

// Script final de inicialización que maneja correctamente las restricciones
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no configurada');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function getTableStructure(tableName) {
  const columns = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = ${tableName}
    AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  
  return columns.map(col => col.column_name);
}

async function getUniqueConstraints(tableName) {
  const constraints = await sql`
    SELECT 
      tc.constraint_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = ${tableName}
    AND tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
  `;
  
  return constraints.map(c => c.column_name);
}

async function initFinal() {
  console.log('🗄️ Inicializando base de datos con datos de prueba (FINAL)...');
  console.log('===========================================================');
  
  try {
    // Verificar conexión
    console.log('🔍 Verificando conexión a base de datos...');
    await sql`SELECT 1`;
    console.log('✅ Conexión a base de datos establecida');
    
    console.log('\n📊 Analizando estructura de tablas...');
    
    // 1. Analizar estructura de institutes
    console.log('🏫 Analizando tabla institutes...');
    const instituteColumns = await getTableStructure('institutes');
    const instituteUniques = await getUniqueConstraints('institutes');
    console.log(`  📝 Columnas disponibles: ${instituteColumns.join(', ')}`);
    console.log(`  🔒 Restricciones únicas: ${instituteUniques.join(', ')}`);
    
    // 2. Analizar estructura de academic_years
    console.log('📅 Analizando tabla academic_years...');
    const academicYearColumns = await getTableStructure('academic_years');
    const academicYearUniques = await getUniqueConstraints('academic_years');
    console.log(`  📝 Columnas disponibles: ${academicYearColumns.join(', ')}`);
    console.log(`  🔒 Restricciones únicas: ${academicYearUniques.join(', ')}`);
    
    // 3. Analizar estructura de modules
    console.log('📚 Analizando tabla modules...');
    const moduleColumns = await getTableStructure('modules');
    const moduleUniques = await getUniqueConstraints('modules');
    console.log(`  📝 Columnas disponibles: ${moduleColumns.join(', ')}`);
    console.log(`  🔒 Restricciones únicas: ${moduleUniques.join(', ')}`);
    
    // 4. Analizar estructura de users
    console.log('👥 Analizando tabla users...');
    const userColumns = await getTableStructure('users');
    const userUniques = await getUniqueConstraints('users');
    console.log(`  📝 Columnas disponibles: ${userColumns.join(', ')}`);
    console.log(`  🔒 Restricciones únicas: ${userUniques.join(', ')}`);
    
    console.log('\n📊 Creando datos de prueba...');
    
    // 1. Crear instituto
    console.log('🏫 Creando instituto de prueba...');
    let institute;
    
    const instituteData = {
      name: 'Institut de Prova GEI',
      code: 'GEI001',
      address: 'Carrer de Prova, 123, Barcelona',
      phone: '+34 93 123 45 67',
      email: 'info@gei-prova.es',
      website: 'https://gei-prova.es'
    };
    
    // Filtrar solo las columnas que existen
    const validInstituteColumns = Object.keys(instituteData).filter(key => 
      instituteColumns.includes(key)
    );
    const filteredInstituteData = {};
    validInstituteColumns.forEach(key => {
      filteredInstituteData[key] = instituteData[key];
    });
    
    console.log(`  📝 Usando columnas: ${validInstituteColumns.join(', ')}`);
    
    try {
      // Verificar si ya existe
      const existingInstitute = await sql`SELECT * FROM institutes WHERE code = 'GEI001'`;
      
      if (existingInstitute.length > 0) {
        institute = existingInstitute[0];
        console.log(`✅ Instituto ya existe: ${institute.name} (${institute.code})`);
      } else {
        const [instituteResult] = await sql`
          INSERT INTO institutes ${sql(filteredInstituteData)}
          RETURNING *
        `;
        institute = instituteResult;
        console.log(`✅ Instituto creado: ${institute.name} (${institute.code})`);
      }
    } catch (error) {
      console.log(`  ❌ Error con instituto: ${error.message}`);
      // Intentar obtener cualquier instituto existente
      try {
        const [existingInstitute] = await sql`SELECT * FROM institutes LIMIT 1`;
        if (existingInstitute) {
          institute = existingInstitute;
          console.log(`✅ Usando instituto existente: ${institute.name}`);
        }
      } catch (err) {
        console.log(`  ❌ No se pudo obtener instituto: ${err.message}`);
        return;
      }
    }
    
    // 2. Crear año académico
    console.log('📅 Creando año académico...');
    let academicYear;
    
    const academicYearData = {
      institute_id: institute.id,
      name: '2024-2025',
      start_date: '2024-09-01',
      end_date: '2025-06-30'
    };
    
    // Agregar is_active solo si existe la columna
    if (academicYearColumns.includes('is_active')) {
      academicYearData.is_active = true;
    }
    
    // Filtrar solo las columnas que existen
    const validAcademicYearColumns = Object.keys(academicYearData).filter(key => 
      academicYearColumns.includes(key)
    );
    const filteredAcademicYearData = {};
    validAcademicYearColumns.forEach(key => {
      filteredAcademicYearData[key] = academicYearData[key];
    });
    
    console.log(`  📝 Usando columnas: ${validAcademicYearColumns.join(', ')}`);
    
    try {
      // Verificar si ya existe
      const existingYear = await sql`
        SELECT * FROM academic_years 
        WHERE name = '2024-2025' AND institute_id = ${institute.id}
      `;
      
      if (existingYear.length > 0) {
        academicYear = existingYear[0];
        console.log(`✅ Año académico ya existe: ${academicYear.name}`);
      } else {
        const [academicYearResult] = await sql`
          INSERT INTO academic_years ${sql(filteredAcademicYearData)}
          RETURNING *
        `;
        academicYear = academicYearResult;
        console.log(`✅ Año académico creado: ${academicYear.name}`);
      }
    } catch (error) {
      console.log(`  ❌ Error con año académico: ${error.message}`);
      // Intentar obtener cualquier año académico existente
      try {
        const [existingYear] = await sql`SELECT * FROM academic_years WHERE institute_id = ${institute.id} LIMIT 1`;
        if (existingYear) {
          academicYear = existingYear;
          console.log(`✅ Usando año académico existente: ${academicYear.name}`);
        }
      } catch (err) {
        console.log(`  ❌ No se pudo obtener año académico: ${err.message}`);
        return;
      }
    }
    
    // 3. Crear módulos
    console.log('📚 Creando módulos...');
    
    const modulesData = [
      { name: 'Gestió d\'Avaluacions', description: 'Mòdul per gestionar avaluacions i notes' },
      { name: 'Control d\'Assistència', description: 'Mòdul per controlar l\'assistència dels alumnes' },
      { name: 'Gestió de Guàrdies', description: 'Mòdul per gestionar les guàrdies dels professors' },
      { name: 'Enquestes', description: 'Mòdul per crear i gestionar enquestes' },
      { name: 'Recursos', description: 'Mòdul per gestionar recursos i reserves' },
      { name: 'Analítiques', description: 'Mòdul per visualitzar analítiques i informes' }
    ];
    
    // Agregar columnas adicionales si existen
    if (moduleColumns.includes('display_name')) {
      modulesData.forEach(module => {
        module.display_name = module.name;
      });
    }
    if (moduleColumns.includes('code')) {
      modulesData.forEach((module, index) => {
        module.code = ['EVAL', 'ATT', 'GUARD', 'SURV', 'RES', 'ANAL'][index];
      });
    }
    if (moduleColumns.includes('icon')) {
      modulesData.forEach(module => {
        module.icon = 'book';
      });
    }
    if (moduleColumns.includes('color')) {
      modulesData.forEach(module => {
        module.color = '#3b82f6';
      });
    }
    if (moduleColumns.includes('is_active')) {
      modulesData.forEach(module => {
        module.is_active = true;
      });
    }
    
    const createdModules = [];
    for (const moduleData of modulesData) {
      try {
        // Filtrar solo las columnas que existen
        const validModuleColumns = Object.keys(moduleData).filter(key => 
          moduleColumns.includes(key)
        );
        const filteredModuleData = {};
        validModuleColumns.forEach(key => {
          filteredModuleData[key] = moduleData[key];
        });
        
        // Verificar si ya existe
        const existingModule = await sql`SELECT * FROM modules WHERE name = ${moduleData.name}`;
        
        if (existingModule.length > 0) {
          createdModules.push(existingModule[0]);
          console.log(`  ⚠️ Módulo ya existe: ${moduleData.name}`);
        } else {
          const [module] = await sql`
            INSERT INTO modules ${sql(filteredModuleData)}
            RETURNING *
          `;
          createdModules.push(module);
          console.log(`  ✅ Módulo creado: ${module.name}`);
        }
      } catch (error) {
        console.log(`  ❌ Error creando módulo ${moduleData.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ ${createdModules.length} módulos procesados`);
    
    // 4. Crear usuarios de prueba
    console.log('👥 Creando usuarios de prueba...');
    
    // Hash de contraseñas
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const usersData = [
      {
        institute_id: institute.id,
        email: 'superadmin@gei.es',
        display_name: 'Super Administrador',
        first_name: 'Super',
        last_name: 'Admin',
        role: 'super_admin',
        password_hash: passwordHash
      },
      {
        institute_id: institute.id,
        email: 'admin@gei.es',
        display_name: 'Administrador Institut',
        first_name: 'Admin',
        last_name: 'Institut',
        role: 'institute_admin',
        password_hash: passwordHash
      },
      {
        institute_id: institute.id,
        email: 'professor@gei.es',
        display_name: 'Professor Prova',
        first_name: 'Professor',
        last_name: 'Prova',
        role: 'teacher',
        password_hash: passwordHash
      },
      {
        institute_id: institute.id,
        email: 'alumne@gei.es',
        display_name: 'Alumne Prova',
        first_name: 'Alumne',
        last_name: 'Prova',
        role: 'student',
        password_hash: passwordHash
      }
    ];
    
    // Agregar preferences solo si existe la columna
    if (userColumns.includes('preferences')) {
      usersData.forEach((user, index) => {
        const themes = ['dark', 'light', 'system', 'light'];
        user.preferences = {
          theme: themes[index],
          language: 'ca',
          notifications: index < 3
        };
      });
    }
    
    const createdUsers = [];
    for (const userData of usersData) {
      try {
        // Filtrar solo las columnas que existen
        const validUserColumns = Object.keys(userData).filter(key => 
          userColumns.includes(key)
        );
        const filteredUserData = {};
        validUserColumns.forEach(key => {
          filteredUserData[key] = userData[key];
        });
        
        // Verificar si ya existe
        const existingUser = await sql`SELECT * FROM users WHERE email = ${userData.email}`;
        
        if (existingUser.length > 0) {
          createdUsers.push(existingUser[0]);
          console.log(`  ⚠️ Usuario ya existe: ${userData.email}`);
        } else {
          const [user] = await sql`
            INSERT INTO users ${sql(filteredUserData)}
            RETURNING *
          `;
          createdUsers.push(user);
          console.log(`  ✅ Usuario creado: ${user.display_name} (${user.email})`);
        }
      } catch (error) {
        console.log(`  ❌ Error creando usuario ${userData.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ ${createdUsers.length} usuarios procesados`);
    
    // 5. Crear clases de prueba (si la tabla existe)
    try {
      const classColumns = await getTableStructure('classes');
      if (classColumns.length > 0) {
        console.log('📚 Creando clases de prueba...');
        
        const classesData = [
          {
            institute_id: institute.id,
            academic_year_id: academicYear.id,
            name: '1r ESO A',
            description: 'Primer curs d\'ESO, grup A',
            max_students: 30
          },
          {
            institute_id: institute.id,
            academic_year_id: academicYear.id,
            name: '2n ESO B',
            description: 'Segon curs d\'ESO, grup B',
            max_students: 28
          }
        ];
        
        // Agregar is_active si existe
        if (classColumns.includes('is_active')) {
          classesData.forEach(cls => {
            cls.is_active = true;
          });
        }
        
        for (const classData of classesData) {
          try {
            const validClassColumns = Object.keys(classData).filter(key => 
              classColumns.includes(key)
            );
            const filteredClassData = {};
            validClassColumns.forEach(key => {
              filteredClassData[key] = classData[key];
            });
            
            await sql`INSERT INTO classes ${sql(filteredClassData)}`;
            console.log(`  ✅ Clase creada: ${classData.name}`);
          } catch (error) {
            console.log(`  ⚠️ Error creando clase ${classData.name}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log('  ⚠️ Tabla classes no existe o error al acceder');
    }
    
    // 6. Crear competencias de prueba (si la tabla existe)
    try {
      const competencyColumns = await getTableStructure('competencies');
      if (competencyColumns.length > 0) {
        console.log('🎯 Creando competencias de prueba...');
        
        const competenciesData = [
          {
            institute_id: institute.id,
            academic_year_id: academicYear.id,
            code: 'CT_CC_1',
            abbreviation: 'CC1',
            subject: 'Matemàtiques',
            description: 'Competència matemàtica i competències bàsiques en ciència i tecnologia',
            type: 'CT_CC'
          },
          {
            institute_id: institute.id,
            academic_year_id: academicYear.id,
            code: 'CT_CD_1',
            abbreviation: 'CD1',
            subject: 'Llengua Catalana',
            description: 'Competència en comunicació lingüística',
            type: 'CT_CD'
          }
        ];
        
        for (const compData of competenciesData) {
          try {
            const validCompColumns = Object.keys(compData).filter(key => 
              competencyColumns.includes(key)
            );
            const filteredCompData = {};
            validCompColumns.forEach(key => {
              filteredCompData[key] = compData[key];
            });
            
            await sql`INSERT INTO competencies ${sql(filteredCompData)}`;
            console.log(`  ✅ Competencia creada: ${compData.code}`);
          } catch (error) {
            console.log(`  ⚠️ Error creando competencia ${compData.code}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log('  ⚠️ Tabla competencies no existe o error al acceder');
    }
    
    // 7. Crear recursos de prueba (si la tabla existe)
    try {
      const resourceColumns = await getTableStructure('resources');
      if (resourceColumns.length > 0) {
        console.log('📦 Creando recursos de prueba...');
        
        const resourcesData = [
          {
            institute_id: institute.id,
            name: 'Aula d\'Informàtica 1',
            description: 'Aula amb 25 ordinadors per a classes d\'informàtica',
            type: 'classroom',
            capacity: 25
          },
          {
            institute_id: institute.id,
            name: 'Projector Sala d\'Actes',
            description: 'Projector per a presentacions i actes',
            type: 'equipment',
            capacity: 1
          }
        ];
        
        // Agregar is_active si existe
        if (resourceColumns.includes('is_active')) {
          resourcesData.forEach(res => {
            res.is_active = true;
          });
        }
        
        for (const resData of resourcesData) {
          try {
            const validResColumns = Object.keys(resData).filter(key => 
              resourceColumns.includes(key)
            );
            const filteredResData = {};
            validResColumns.forEach(key => {
              filteredResData[key] = resData[key];
            });
            
            await sql`INSERT INTO resources ${sql(filteredResData)}`;
            console.log(`  ✅ Recurso creado: ${resData.name}`);
          } catch (error) {
            console.log(`  ⚠️ Error creando recurso ${resData.name}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log('  ⚠️ Tabla resources no existe o error al acceder');
    }
    
    console.log('\n🎉 Inicialización FINAL completada exitosamente!');
    console.log('📊 Resumen:');
    console.log(`  🏫 Instituto: ${institute.name}`);
    console.log(`  📅 Año académico: ${academicYear.name}`);
    console.log(`  📚 Módulos: ${createdModules.length}`);
    console.log(`  👥 Usuarios: ${createdUsers.length}`);
    
    console.log('\n🔑 Credenciales de acceso:');
    console.log('========================');
    console.log('👑 Super Admin: superadmin@gei.es / password123');
    console.log('👨‍💼 Admin: admin@gei.es / password123');
    console.log('👨‍🏫 Professor: professor@gei.es / password123');
    console.log('👨‍🎓 Alumne: alumne@gei.es / password123');
    
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

initFinal().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 