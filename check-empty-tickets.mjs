import { createConnection as mysqlCreateConnection } from 'mysql2/promise';

async function checkEmptyTickets() {
  try {
    const connection = await mysqlCreateConnection({
      host: 'sql.freedb.tech',
      port: 3306,
      user: 'freedb_mohamad',
      password: 'u2!h$fH$29QPQcY',
      database: 'freedb_TicketTracker'
    });
    
    // Check for tickets with null or empty descriptions
    const [emptyTickets] = await connection.execute(`
      SELECT id, jd_ticket_number, description, category, priority, status, assignee, manager, date_opening
      FROM tickets 
      WHERE description IS NULL OR description = '' OR 
            jd_ticket_number IS NULL OR jd_ticket_number = '' OR
            category IS NULL OR category = '' OR
            priority IS NULL OR priority = '' OR
            status IS NULL OR status = ''
      ORDER BY id
    `);
    
    console.log('🔍 Tickets with empty/null fields:');
    if (emptyTickets.length === 0) {
      console.log('  ✅ No tickets with empty/null fields found');
    } else {
      emptyTickets.forEach(ticket => {
        console.log(`  ❌ Ticket ID ${ticket.id}:`);
        console.log(`     - JD Number: ${ticket.jd_ticket_number || 'NULL'}`);
        console.log(`     - Description: ${ticket.description || 'NULL'}`);
        console.log(`     - Category: ${ticket.category || 'NULL'}`);
        console.log(`     - Priority: ${ticket.priority || 'NULL'}`);
        console.log(`     - Status: ${ticket.status || 'NULL'}`);
        console.log(`     - Assignee: ${ticket.assignee || 'NULL'}`);
        console.log(`     - Manager: ${ticket.manager || 'NULL'}`);
        console.log(`     - Date: ${ticket.date_opening || 'NULL'}`);
        console.log('');
      });
    }
    
    // Check total tickets
    const [totalTickets] = await connection.execute('SELECT COUNT(*) as count FROM tickets');
    console.log(`📊 Total tickets in database: ${totalTickets[0].count}`);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkEmptyTickets();
