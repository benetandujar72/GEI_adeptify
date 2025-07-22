#!/usr/bin/env node

// Script para completar datos faltantes en tablas específicas
import postgres from 'postgres';

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

async function completeData() {
  console.log('🔧 Completando datos faltantes...');
  console.log('==================================');
  
  try {
    // Verificar conexión
    console.log('🔍 Verificando conexión a base de datos...');
    await sql`SELECT 1`;
    console.log('✅ Conexión a base de datos establecida');
    
    // Obtener instituto y año académico existentes
    console.log('\n📊 Obteniendo datos existentes...');
    const [institute] = await sql`SELECT * FROM institutes WHERE code = 'GEI001'`;
    const [academicYear] = await sql`SELECT * FROM academic_years WHERE name = '2024-2025' AND institute_id = ${institute.id}`;
    
    console.log(`✅ Instituto: ${institute.name}`);
    console.log(`✅ Año académico: ${academicYear.name}`);
    
    // 1. Completar clases con código
    console.log('\n📚 Completando clases de prueba...');
    try {
      const classColumns = await getTableStructure('classes');
      console.log(`  📝 Columnas disponibles en classes: ${classColumns.join(', ')}`);
      
      const classesData = [
        {
          institute_id: institute.id,
          academic_year_id: academicYear.id,
          name: '1r ESO A',
          code: '1ESOA',
          description: 'Primer curs d\'ESO, grup A',
          max_students: 30
        },
        {
          institute_id: institute.id,
          academic_year_id: academicYear.id,
          name: '2n ESO B',
          code: '2ESOB',
          description: 'Segon curs d\'ESO, grup B',
          max_students: 28
        }
      ];
      
      // Agregar columnas adicionales si existen
      if (classColumns.includes('is_active')) {
        classesData.forEach(cls => {
          cls.is_active = true;
        });
      }
      if (classColumns.includes('status')) {
        classesData.forEach(cls => {
          cls.status = 'active';
        });
      }
      if (classColumns.includes('settings')) {
        classesData.forEach(cls => {
          cls.settings = {};
        });
      }
      
      for (const classData of classesData) {
        try {
          // Verificar si ya existe
          const existingClass = await sql`SELECT * FROM classes WHERE code = ${classData.code}`;
          
          if (existingClass.length > 0) {
            console.log(`  ⚠️ Clase ya existe: ${classData.name} (${classData.code})`);
          } else {
            const validClassColumns = Object.keys(classData).filter(key => 
              classColumns.includes(key)
            );
            const filteredClassData = {};
            validClassColumns.forEach(key => {
              filteredClassData[key] = classData[key];
            });
            
            await sql`INSERT INTO classes ${sql(filteredClassData)}`;
            console.log(`  ✅ Clase creada: ${classData.name} (${classData.code})`);
          }
        } catch (error) {
          console.log(`  ❌ Error creando clase ${classData.name}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error accediendo a tabla classes: ${error.message}`);
    }
    
    // 2. Completar competencias con nombre
    console.log('\n🎯 Completando competencias de prueba...');
    try {
      const competencyColumns = await getTableStructure('competencies');
      console.log(`  📝 Columnas disponibles en competencies: ${competencyColumns.join(', ')}`);
      
      const competenciesData = [
        {
          institute_id: institute.id,
          academic_year_id: academicYear.id,
          name: 'Competència Matemàtica',
          code: 'CT_CC_1',
          abbreviation: 'CC1',
          subject: 'Matemàtiques',
          description: 'Competència matemàtica i competències bàsiques en ciència i tecnologia',
          type: 'CT_CC'
        },
        {
          institute_id: institute.id,
          academic_year_id: academicYear.id,
          name: 'Competència Lingüística',
          code: 'CT_CD_1',
          abbreviation: 'CD1',
          subject: 'Llengua Catalana',
          description: 'Competència en comunicació lingüística',
          type: 'CT_CD'
        }
      ];
      
      // Agregar columnas adicionales si existen
      if (competencyColumns.includes('is_active')) {
        competenciesData.forEach(comp => {
          comp.is_active = true;
        });
      }
      if (competencyColumns.includes('status')) {
        competenciesData.forEach(comp => {
          comp.status = 'active';
        });
      }
      if (competencyColumns.includes('settings')) {
        competenciesData.forEach(comp => {
          comp.settings = {};
        });
      }
      
      for (const compData of competenciesData) {
        try {
          // Verificar si ya existe
          const existingComp = await sql`SELECT * FROM competencies WHERE code = ${compData.code}`;
          
          if (existingComp.length > 0) {
            console.log(`  ⚠️ Competencia ya existe: ${compData.name} (${compData.code})`);
          } else {
            const validCompColumns = Object.keys(compData).filter(key => 
              competencyColumns.includes(key)
            );
            const filteredCompData = {};
            validCompColumns.forEach(key => {
              filteredCompData[key] = compData[key];
            });
            
            await sql`INSERT INTO competencies ${sql(filteredCompData)}`;
            console.log(`  ✅ Competencia creada: ${compData.name} (${compData.code})`);
          }
        } catch (error) {
          console.log(`  ❌ Error creando competencia ${compData.name}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error accediendo a tabla competencies: ${error.message}`);
    }
    
    // 3. Verificar datos finales
    console.log('\n📊 Verificando datos finales...');
    
    try {
      const instituteCount = await sql`SELECT COUNT(*) as count FROM institutes`;
      const academicYearCount = await sql`SELECT COUNT(*) as count FROM academic_years`;
      const moduleCount = await sql`SELECT COUNT(*) as count FROM modules`;
      const userCount = await sql`SELECT COUNT(*) as count FROM users`;
      const classCount = await sql`SELECT COUNT(*) as count FROM classes`;
      const competencyCount = await sql`SELECT COUNT(*) as count FROM competencies`;
      const resourceCount = await sql`SELECT COUNT(*) as count FROM resources`;
      
      console.log('📈 Resumen de datos:');
      console.log(`  🏫 Institutos: ${instituteCount[0].count}`);
      console.log(`  📅 Años académicos: ${academicYearCount[0].count}`);
      console.log(`  📚 Módulos: ${moduleCount[0].count}`);
      console.log(`  👥 Usuarios: ${userCount[0].count}`);
      console.log(`  📚 Clases: ${classCount[0].count}`);
      console.log(`  🎯 Competencias: ${competencyCount[0].count}`);
      console.log(`  📦 Recursos: ${resourceCount[0].count}`);
    } catch (error) {
      console.log(`  ❌ Error verificando datos: ${error.message}`);
    }
    
    console.log('\n🎉 Completado de datos finalizado!');
    console.log('✅ La base de datos está lista para usar');
    
    console.log('\n🔑 Credenciales de acceso:');
    console.log('========================');
    console.log('👑 Super Admin: superadmin@gei.es / password123');
    console.log('👨‍💼 Admin: admin@gei.es / password123');
    console.log('👨‍🏫 Professor: professor@gei.es / password123');
    console.log('👨‍🎓 Alumne: alumne@gei.es / password123');
    
  } catch (error) {
    console.error('❌ Error completando datos:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

completeData().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 