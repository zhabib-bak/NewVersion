import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

async function comprehensiveCodeAnalysis() {
  console.log('🔍 ANÁLISIS COMPLETO DE CÓDIGO FUENTE');
  console.log('=====================================\n');
  
  const analysisResults = {
    files: {},
    architecture: {},
    quality: {},
    security: {},
    performance: {},
    maintainability: {},
    recommendations: []
  };
  
  // 1. ANÁLISIS DE ARCHIVOS
  console.log('📁 ANÁLISIS DE ARCHIVOS');
  console.log('----------------------');
  
  const files = [
    { name: 'server.mjs', type: 'backend', critical: true },
    { name: 'app.js', type: 'frontend', critical: true },
    { name: 'index.html', type: 'frontend', critical: true },
    { name: 'styles.css', type: 'frontend', critical: true },
    { name: 'package.json', type: 'config', critical: true },
    { name: '.env', type: 'config', critical: true },
    { name: 'README.md', type: 'documentation', critical: false }
  ];
  
  for (const file of files) {
    if (existsSync(file.name)) {
      const stats = statSync(file.name);
      const content = readFileSync(file.name, 'utf8');
      
      analysisResults.files[file.name] = {
        exists: true,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2),
        lines: content.split('\n').length,
        type: file.type,
        critical: file.critical
      };
      
      console.log(`✅ ${file.name}: ${analysisResults.files[file.name].sizeKB} KB, ${analysisResults.files[file.name].lines} lines`);
    } else {
      analysisResults.files[file.name] = { exists: false };
      console.log(`❌ ${file.name}: FALTANTE`);
    }
  }
  
  // 2. ANÁLISIS DE ARQUITECTURA
  console.log('\n🏗️  ANÁLISIS DE ARQUITECTURA');
  console.log('--------------------------');
  
  try {
    const serverContent = readFileSync('server.mjs', 'utf8');
    const appContent = readFileSync('app.js', 'utf8');
    
    // Backend Architecture
    const backendPatterns = {
      express: /express|createServer/g,
      database: /mysql|database|pool/g,
      auth: /auth|login|session/g,
      api: /api|router|endpoint/g,
      middleware: /middleware|cors|helmet/g,
      errorHandling: /try|catch|error/g
    };
    
    console.log('🔧 Backend Architecture:');
    Object.entries(backendPatterns).forEach(([component, pattern]) => {
      const matches = serverContent.match(pattern);
      const count = matches ? matches.length : 0;
      console.log(`  ${component}: ${count} occurrences`);
      analysisResults.architecture[component] = count;
    });
    
    // Frontend Architecture
    const frontendPatterns = {
      dom: /querySelector|getElementById|addEventListener/g,
      state: /state|useState|setState/g,
      api: /fetch|api|axios/g,
      routing: /router|route|hash/g,
      components: /function|class|component/g,
      events: /event|listener|handler/g
    };
    
    console.log('\n🎨 Frontend Architecture:');
    Object.entries(frontendPatterns).forEach(([component, pattern]) => {
      const matches = appContent.match(pattern);
      const count = matches ? matches.length : 0;
      console.log(`  ${component}: ${count} occurrences`);
      analysisResults.architecture[component] = count;
    });
    
  } catch (error) {
    console.log('❌ Error en análisis de arquitectura:', error.message);
  }
  
  // 3. ANÁLISIS DE CALIDAD
  console.log('\n📊 ANÁLISIS DE CALIDAD');
  console.log('---------------------');
  
  try {
    const serverContent = readFileSync('server.mjs', 'utf8');
    const appContent = readFileSync('app.js', 'utf8');
    const cssContent = readFileSync('styles.css', 'utf8');
    
    // Code Quality Metrics
    const qualityMetrics = {
      functions: {
        server: (serverContent.match(/function\s+\w+|async\s+function/g) || []).length,
        frontend: (appContent.match(/function\s+\w+|=>\s*{/g) || []).length
      },
      asyncOperations: {
        server: (serverContent.match(/async|await/g) || []).length,
        frontend: (appContent.match(/async|await/g) || []).length
      },
      errorHandling: {
        server: (serverContent.match(/try\s*{|catch\s*\(/g) || []).length,
        frontend: (appContent.match(/try\s*{|catch\s*\(/g) || []).length
      },
      comments: {
        server: (serverContent.match(/\/\/|\/\*|\*\/|<!--|-->/g) || []).length,
        frontend: (appContent.match(/\/\/|\/\*|\*\/|<!--|-->/g) || []).length,
        css: (cssContent.match(/\/\*|\*\/|<!--|-->/g) || []).length
      },
      complexity: {
        serverLines: serverContent.split('\n').length,
        frontendLines: appContent.split('\n').length,
        cssLines: cssContent.split('\n').length
      }
    };
    
    console.log('📈 Métricas de Calidad:');
    Object.entries(qualityMetrics).forEach(([metric, values]) => {
      console.log(`  ${metric}:`);
      Object.entries(values).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}`);
      });
      analysisResults.quality[metric] = values;
    });
    
    // Calculate quality score
    const totalFunctions = qualityMetrics.functions.server + qualityMetrics.functions.frontend;
    const totalComments = qualityMetrics.comments.server + qualityMetrics.comments.frontend + qualityMetrics.comments.css;
    const totalErrorHandling = qualityMetrics.errorHandling.server + qualityMetrics.errorHandling.frontend;
    const totalLines = qualityMetrics.complexity.serverLines + qualityMetrics.complexity.frontendLines + qualityMetrics.complexity.cssLines;
    
    const commentRatio = (totalComments / totalLines * 100).toFixed(1);
    const errorHandlingRatio = (totalErrorHandling / totalFunctions * 100).toFixed(1);
    
    console.log(`\n📊 Ratios de Calidad:`);
    console.log(`  Comment/Lines ratio: ${commentRatio}%`);
    console.log(`  Error Handling/Functions: ${errorHandlingRatio}%`);
    
  } catch (error) {
    console.log('❌ Error en análisis de calidad:', error.message);
  }
  
  // 4. ANÁLISIS DE SEGURIDAD
  console.log('\n🔒 ANÁLISIS DE SEGURIDAD');
  console.log('-----------------------');
  
  try {
    const serverContent = readFileSync('server.mjs', 'utf8');
    const appContent = readFileSync('app.js', 'utf8');
    
    const securityChecks = {
      passwordHashing: /bcrypt|scrypt|argon/g,
      sessionManagement: /session|cookie|jwt/g,
      inputValidation: /validate|sanitize|escape/g,
      sqlInjection: /prepared|parameterized|execute/g,
      csrfProtection: /csrf|xsrf/g,
      rateLimiting: /rate.*limit|throttle/g,
      httpsOnly: /https|ssl|tls/g,
      hardcodedSecrets: /password\s*=\s*['"][^'"]{3,}['"]|secret\s*=\s*['"][^'"]{3,}['"]|api_key\s*=\s*['"][^'"]{3,}['"]/g
    };
    
    console.log('🛡️  Verificaciones de Seguridad:');
    Object.entries(securityChecks).forEach(([check, pattern]) => {
      const matches = serverContent.match(pattern) || appContent.match(pattern);
      const found = matches && matches.length > 0;
      const count = matches ? matches.length : 0;
      
      if (check === 'hardcodedSecrets') {
        console.log(`  ${check}: ${found ? '❌ FOUND' : '✅ NONE'} (${count} occurrences)`);
      } else {
        console.log(`  ${check}: ${found ? '✅ IMPLEMENTED' : '⚠️  MISSING'} (${count} occurrences)`);
      }
      
      analysisResults.security[check] = { found, count };
    });
    
  } catch (error) {
    console.log('❌ Error en análisis de seguridad:', error.message);
  }
  
  // 5. ANÁLISIS DE PERFORMANCE
  console.log('\n⚡ ANÁLISIS DE PERFORMANCE');
  console.log('------------------------');
  
  try {
    const serverContent = readFileSync('server.mjs', 'utf8');
    const appContent = readFileSync('app.js', 'utf8');
    
    const performanceChecks = {
      connectionPooling: /pool|connection.*pool/g,
      caching: /cache|Cache/g,
      compression: /compression|gzip/g,
      asyncOperations: /async|await/g,
      syncOperations: /readFileSync|writeFileSync|existsSync/g,
      databaseOptimization: /index|optimize|query/g,
      lazyLoading: /lazy|defer|async.*load/g,
      bundleSize: {
        server: statSync('server.mjs').size,
        frontend: statSync('app.js').size,
        css: statSync('styles.css').size
      }
    };
    
    console.log('🚀 Checks de Performance:');
    Object.entries(performanceChecks).forEach(([check, pattern]) => {
      if (check === 'bundleSize') {
        console.log(`  ${check}:`);
        Object.entries(pattern).forEach(([file, size]) => {
          const sizeKB = (size / 1024).toFixed(2);
          const status = size > 200000 ? '⚠️  LARGE' : '✅ OK';
          console.log(`    ${file}: ${sizeKB} KB ${status}`);
        });
      } else {
        const matches = serverContent.match(pattern) || appContent.match(pattern);
        const found = matches && matches.length > 0;
        const count = matches ? matches.length : 0;
        console.log(`  ${check}: ${found ? '✅ IMPLEMENTED' : '⚠️  MISSING'} (${count} occurrences)`);
      }
      
      analysisResults.performance[check] = pattern;
    });
    
  } catch (error) {
    console.log('❌ Error en análisis de performance:', error.message);
  }
  
  // 6. ANÁLISIS DE MANTENIBILIDAD
  console.log('\n🔧 ANÁLISIS DE MANTENIBILIDAD');
  console.log('---------------------------');
  
  try {
    const serverContent = readFileSync('server.mjs', 'utf8');
    const appContent = readFileSync('app.js', 'utf8');
    
    const maintainabilityChecks = {
      modularization: {
        server: (serverContent.match(/export|import|module/g) || []).length,
        frontend: (appContent.match(/export|import|module/g) || []).length
      },
      codeOrganization: {
        functions: (serverContent.match(/function\s+\w+|async\s+function/g) || []).length,
        classes: (serverContent.match(/class\s+\w+/g) || []).length,
        constants: (serverContent.match(/const\s+\w+/g) || []).length
      },
      namingConvention: {
        camelCase: (serverContent.match(/[a-z][a-zA-Z0-9]*[A-Z]/g) || []).length,
        constants: (serverContent.match(/[A-Z][A-Z_]*[A-Z]/g) || []).length
      },
      documentation: {
        comments: (serverContent.match(/\/\/|\/\*|\*\/|<!--|-->/g) || []).length,
        readme: existsSync('README.md') ? '✅ EXISTS' : '❌ MISSING'
      },
      testing: {
        testFiles: existsSync('test/') || existsSync('tests/') || existsSync('spec/') ? '✅ FOUND' : '⚠️  NONE',
        testScripts: existsSync('package.json') ? (readFileSync('package.json', 'utf8').match(/test|spec/g) || []).length : 0
      }
    };
    
    console.log('🔧 Checks de Mantenibilidad:');
    Object.entries(maintainabilityChecks).forEach(([check, values]) => {
      console.log(`  ${check}:`);
      Object.entries(values).forEach(([key, value]) => {
        if (typeof value === 'number') {
          console.log(`    ${key}: ${value}`);
        } else {
          console.log(`    ${key}: ${value}`);
        }
      });
      analysisResults.maintainability[check] = values;
    });
    
  } catch (error) {
    console.log('❌ Error en análisis de mantenibilidad:', error.message);
  }
  
  // 7. RECOMENDACIONES
  console.log('\n💡 RECOMENDACIONES');
  console.log('------------------');
  
  const recommendations = [];
  
  // Security recommendations
  if (!analysisResults.security.csrfProtection.found) {
    recommendations.push('🔒 Implementar CSRF protection para mayor seguridad');
  }
  
  if (!analysisResults.security.rateLimiting.found) {
    recommendations.push('⚡ Agregar rate limiting para prevenir abuse');
  }
  
  // Performance recommendations
  if (!analysisResults.performance.caching.found) {
    recommendations.push('💾 Implementar caching layer para mejorar performance');
  }
  
  if (!analysisResults.performance.compression.found) {
    recommendations.push('🗜️  Agregar compression middleware para responses');
  }
  
  // Quality recommendations
  const totalComments = Object.values(analysisResults.quality.comments).reduce((a, b) => a + b, 0);
  const totalLines = Object.values(analysisResults.quality.complexity).reduce((a, b) => a + b, 0);
  const commentRatio = (totalComments / totalLines * 100).toFixed(1);
  
  if (parseFloat(commentRatio) < 10) {
    recommendations.push('📝 Aumentar documentación y comentarios (actual: ' + commentRatio + '%)');
  }
  
  // Architecture recommendations
  if (analysisResults.architecture.functions > 50) {
    recommendations.push('🏗️  Considerar modularización en múltiples archivos para mejor mantenibilidad');
  }
  
  // Maintainability recommendations
  if (!analysisResults.maintainability.testing.testFiles.includes('FOUND')) {
    recommendations.push('🧪 Agregar suite de tests automatizados');
  }
  
  if (recommendations.length === 0) {
    console.log('✅ El código está bien estructurado y optimizado');
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  analysisResults.recommendations = recommendations;
  
  // 8. RESUMEN FINAL
  console.log('\n📋 RESUMEN FINAL');
  console.log('================');
  
  const summary = {
    filesAnalyzed: Object.keys(analysisResults.files).length,
    criticalFiles: Object.values(analysisResults.files).filter(f => f.critical && f.exists).length,
    securityScore: Object.values(analysisResults.security).filter(s => s.found).length / Object.keys(analysisResults.security).length * 100,
    performanceScore: Object.keys(analysisResults.performance).filter(k => k !== 'bundleSize').filter(k => analysisResults.performance[k].found).length / 6 * 100,
    qualityScore: parseFloat(commentRatio),
    recommendations: recommendations.length
  };
  
  console.log(`📁 Archivos analizados: ${summary.filesAnalyzed}`);
  console.log(`🔥 Archivos críticos: ${summary.criticalFiles}/${Object.values(analysisResults.files).filter(f => f.critical).length}`);
  console.log(`🔒 Puntuación seguridad: ${summary.securityScore.toFixed(1)}%`);
  console.log(`⚡ Puntuación performance: ${summary.performanceScore.toFixed(1)}%`);
  console.log(`📊 Puntuación calidad: ${summary.qualityScore}%`);
  console.log(`💡 Recomendaciones: ${summary.recommendations}`);
  
  const overallScore = (summary.securityScore + summary.performanceScore + summary.qualityScore) / 3;
  console.log(`🎯 Puntuación general: ${overallScore.toFixed(1)}%`);
  
  const status = overallScore >= 80 ? '✅ EXCELENTE' : overallScore >= 60 ? '🟡 BUENO' : '⚠️  NECESITA MEJORAS';
  console.log(`🏆 Estado general: ${status}`);
  
  return analysisResults;
}

// Ejecutar análisis completo
comprehensiveCodeAnalysis().catch(console.error);
