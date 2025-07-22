#!/usr/bin/env node

// Script específico para completar competencias con la estructura real
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

async function fixCompetencies() {
  console.log('🎯 Completando competencias con estructura real...');
  console.log('==================================================');
  
  try {
    // Verificar conexión
    console.log('🔍 Verificando conexión a base de datos...');
    await sql`SELECT 1`;
    console.log('✅ Conexión a base de datos establecida');
    
    // Obtener instituto y año académico existentes
    console.log('\n📊 Obteniendo datos existentes...');
    const [institute] = await sql`SELECT * FROM institutes WHERE code = 'GEI001'`;
    console.log(`✅ Instituto: ${institute.name}`);
    
    // Verificar estructura real de competencies
    console.log('\n📋 Verificando estructura de tabla competencies...');
    const competencyColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'competencies'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('📝 Columnas disponibles en competencies:');
    competencyColumns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
    });
    
    // Crear competencias con la estructura real
    console.log('\n🎯 Creando competencias con estructura correcta...');
    
    const competenciesData = [
      {
        institute_id: institute.id,
        name: 'Competència Matemàtica i Científica',
        description: 'Competència matemàtica i competències bàsiques en ciència i tecnologia. Capacitat per aplicar el pensament matemàtic i científic per resoldre problemes de la vida quotidiana.',
        category: 'Competències Bàsiques',
        is_active: true
      },
      {
        institute_id: institute.id,
        name: 'Competència en Comunicació Lingüística',
        description: 'Competència en comunicació lingüística. Capacitat per expressar-se i comunicar-se de manera efectiva en català, castellà i anglès.',
        category: 'Competències Bàsiques',
        is_active: true
      },
      {
        institute_id: institute.id,
        name: 'Competència Digital',
        description: 'Competència digital. Capacitat per utilitzar les tecnologies de la informació i la comunicació de manera crítica i responsable.',
        category: 'Competències Bàsiques',
        is_active: true
      },
      {
        institute_id: institute.id,
        name: 'Competència Social i Cívica',
        description: 'Competència social i cívica. Capacitat per desenvolupar-se com a ciutadà actiu i responsable en una societat democràtica.',
        category: 'Competències Socials',
        is_active: true
      },
      {
        institute_id: institute.id,
        name: 'Competència d\'Aprenentatge Autònom',
        description: 'Competència d\'aprenentatge autònom. Capacitat per aprendre a aprendre i gestionar el propi aprenentatge de manera autònoma.',
        category: 'Competències Personals',
        is_active: true
      },
      {
        institute_id: institute.id,
        name: 'Competència d\'Iniciativa i Emprenedoria',
        description: 'Competència d\'iniciativa i emprenedoria. Capacitat per desenvolupar projectes i idees creatives amb iniciativa i responsabilitat.',
        category: 'Competències Personals',
        is_active: true
      }
    ];
    
    let createdCount = 0;
    for (const compData of competenciesData) {
      try {
        // Verificar si ya existe
        const existingComp = await sql`
          SELECT * FROM competencies 
          WHERE name = ${compData.name} 
          AND institute_id = ${institute.id}
        `;
        
        if (existingComp.length > 0) {
          console.log(`  ⚠️ Competencia ya existe: ${compData.name}`);
        } else {
          await sql`
            INSERT INTO competencies ${sql(compData)}
          `;
          console.log(`  ✅ Competencia creada: ${compData.name}`);
          createdCount++;
        }
      } catch (error) {
        console.log(`  ❌ Error creando competencia ${compData.name}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ ${createdCount} competencias nuevas creadas`);
    
    // Verificar datos finales
    console.log('\n📊 Verificando datos finales...');
    
    try {
      const competencyCount = await sql`SELECT COUNT(*) as count FROM competencies`;
      const classCount = await sql`SELECT COUNT(*) as count FROM classes`;
      
      console.log('📈 Resumen final:');
      console.log(`  🎯 Competencias: ${competencyCount[0].count}`);
      console.log(`  📚 Clases: ${classCount[0].count}`);
      
      // Mostrar algunas competencias creadas
      const sampleCompetencies = await sql`
        SELECT name, category, is_active 
        FROM competencies 
        WHERE institute_id = ${institute.id}
        ORDER BY name
        LIMIT 5
      `;
      
      console.log('\n📋 Muestra de competencias:');
      sampleCompetencies.forEach(comp => {
        console.log(`  - ${comp.name} (${comp.category}) - ${comp.is_active ? 'Activa' : 'Inactiva'}`);
      });
      
    } catch (error) {
      console.log(`  ❌ Error verificando datos: ${error.message}`);
    }
    
    console.log('\n🎉 Competencias completadas exitosamente!');
    console.log('✅ La base de datos está completamente lista');
    
  } catch (error) {
    console.error('❌ Error completando competencias:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

fixCompetencies().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 