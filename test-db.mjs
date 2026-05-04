import { createConnection as mysqlCreateConnection } from 'mysql2/promise';

async function reviewDatabase() {
  try {
    const connection = await mysqlCreateConnection({
      host: process.env.DB_HOST || 'sql.freedb.tech',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'freedb_mohamad',
      password: process.env.DB_PASS || 'u2!h$fH$29QPQcY',
      database: process.env.DB_NAME || 'freedb_TicketTracker'
    });
    
    console.log('✅ MySQL connection successful');
    
    // Check if tables exist
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables found:', tables.map(t => Object.values(t)[0]));
    
    // Check user_accounts table structure
    const [userStructure] = await connection.execute('DESCRIBE user_accounts');
    console.log('👥 User accounts table structure:');
    userStructure.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));
    
    // Check if there are any users
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts');
    console.log(`👤 Users in database: ${userCount[0].count}`);
    
    // Check tickets table
    const [ticketCount] = await connection.execute('SELECT COUNT(*) as count FROM tickets');
    console.log(`🎫 Tickets in database: ${ticketCount[0].count}`);
    
    // Check sample data
    if (userCount[0].count > 0) {
      const [users] = await connection.execute('SELECT name, role, active FROM user_accounts LIMIT 5');
      console.log('👥 Sample users:');
      users.forEach(user => console.log(`  - ${user.name} (${user.role}, active: ${user.active})`));
    }
    
    if (ticketCount[0].count > 0) {
      const [tickets] = await connection.execute('SELECT id, description, status, priority FROM tickets LIMIT 3');
      console.log('🎫 Sample tickets:');
      tickets.forEach(ticket => console.log(`  - #${ticket.id}: ${ticket.description.substring(0, 50)}... (${ticket.status}, ${ticket.priority})`));
    }
    
    await connection.end();
    console.log('✅ Database review completed successfully');
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

reviewDatabase();
