import { createConnection as mysqlCreateConnection } from 'mysql2/promise';

async function checkAllTickets() {
  try {
    const connection = await mysqlCreateConnection({
      host: 'sql.freedb.tech',
      port: 3306,
      user: 'freedb_mohamad',
      password: 'u2!h$fH$29QPQcY',
      database: 'freedb_TicketTracker'
    });
    
    // Get all tickets to see their actual content
    const [tickets] = await connection.execute(`
      SELECT id, jd_ticket_number, description, category, priority, status, assignee, manager, date_opening, date_closed, updates_comments
      FROM tickets 
      ORDER BY id
    `);
    
    console.log('📋 All tickets in database:');
    if (tickets.length === 0) {
      console.log('  ❌ No tickets found');
    } else {
      tickets.forEach(ticket => {
        console.log(`  🎫 Ticket ID ${ticket.id}:`);
        console.log(`     - JD Number: "${ticket.jd_ticket_number}"`);
        console.log(`     - Description: "${ticket.description}"`);
        console.log(`     - Category: "${ticket.category}"`);
        console.log(`     - Priority: "${ticket.priority}"`);
        console.log(`     - Status: "${ticket.status}"`);
        console.log(`     - Assignee: "${ticket.assignee}"`);
        console.log(`     - Manager: "${ticket.manager}"`);
        console.log(`     - Date Opening: "${ticket.date_opening}"`);
        console.log(`     - Date Closed: "${ticket.date_closed}"`);
        console.log(`     - Comments: "${ticket.updates_comments}"`);
        console.log('');
      });
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAllTickets();
