import { createConnection as mysqlCreateConnection } from 'mysql2/promise';

async function checkAdminUsers() {
  try {
    const connection = await mysqlCreateConnection({
      host: 'sql.freedb.tech',
      port: 3306,
      user: 'freedb_mohamad',
      password: 'u2!h$fH$29QPQcY',
      database: 'freedb_TicketTracker'
    });
    
    const [users] = await connection.execute('SELECT name, role, active FROM user_accounts WHERE role = ?', ['admin']);
    console.log('🔍 Current admin users:');
    users.forEach(user => {
      console.log(`  - ${user.name} (active: ${user.active})`);
    });
    
    const [allUsers] = await connection.execute('SELECT name, role, active FROM user_accounts ORDER BY role DESC, name');
    console.log('\n👥 All users:');
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.role}, active: ${user.active})`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminUsers();
