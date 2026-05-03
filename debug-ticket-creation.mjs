#!/usr/bin/env node

import mysql from 'mysql2/promise';

// Database configuration (using the same as server.mjs)
const DB_CONFIG = {
  host: process.env.DB_HOST || 'sql.freedb.tech',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'freedb_mohamad',
  password: process.env.DB_PASS || 'u2!h$fH$29QPQcY',
  database: process.env.DB_NAME || 'freedb_TicketTracker'
};

async function debugTicketCreation() {
  let connection;
  
  try {
    console.log('🎫 DEBUG TICKET CREATION ISSUE');
    console.log('=================================\n');
    
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 1. Check database connection
    console.log('1. 📡 Database Connection Test');
    try {
      await connection.execute('SELECT 1');
      console.log('   ✅ Database connection successful');
    } catch (error) {
      console.log('   ❌ Database connection failed:', error.message);
      return;
    }
    
    // 2. Check tickets table structure
    console.log('\n2. 🗄️ Tickets Table Structure');
    const [columns] = await connection.execute('DESCRIBE tickets');
    console.log('   Columns:');
    columns.forEach(col => {
      console.log(`      - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? '(' + col.Key + ')' : ''}`);
    });
    
    // 3. Check current tickets in database
    console.log('\n3. 🎫 Current Tickets in Database');
    const [tickets] = await connection.execute('SELECT id, jd_ticket_number, description, status, created_at FROM tickets ORDER BY created_at DESC LIMIT 10');
    
    if (tickets.length === 0) {
      console.log('   ℹ️ No tickets found in database');
    } else {
      console.log(`   Found ${tickets.length} recent tickets:`);
      tickets.forEach(ticket => {
        console.log(`      - ID: ${ticket.id}, Ticket #: ${ticket.jd_ticket_number}, Status: ${ticket.status}, Created: ${ticket.created_at}`);
        console.log(`        Description: ${ticket.description.slice(0, 50)}...`);
      });
    }
    
    // 4. Test manual ticket insertion
    console.log('\n4. 🧪 Manual Ticket Insertion Test');
    
    const testTicket = {
      description: 'Test ticket for debugging',
      jd_ticket_number: 'TEST-' + Date.now(),
      category: 'Technical',
      updates_comments: 'Test comment',
      priority: 'P2 medium',
      date_opening: new Date().toISOString().slice(0, 19).replace('T', ' '),
      date_closed: null,
      status: 'Open',
      assignee: 'zacarias',
      manager: 'zacarias',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    };
    
    console.log('   Test ticket data:');
    console.log(`      Description: ${testTicket.description}`);
    console.log(`      Ticket #: ${testTicket.jd_ticket_number}`);
    console.log(`      Category: ${testTicket.category}`);
    console.log(`      Priority: ${testTicket.priority}`);
    console.log(`      Status: ${testTicket.status}`);
    console.log(`      Assignee: ${testTicket.assignee}`);
    
    try {
      console.log('\n   Attempting to insert test ticket...');
      
      const insertQuery = `
        INSERT INTO tickets (
          description, jd_ticket_number, category, updates_comments, priority, 
          date_opening, date_closed, status, assignee, manager, due_date, 
          reopened_count, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
      `;
      
      const [result] = await connection.execute(insertQuery, [
        testTicket.description,
        testTicket.jd_ticket_number,
        testTicket.category,
        testTicket.updates_comments,
        testTicket.priority,
        testTicket.date_opening,
        testTicket.date_closed,
        testTicket.status,
        testTicket.assignee,
        testTicket.manager,
        testTicket.due_date
      ]);
      
      console.log(`   ✅ Ticket inserted successfully!`);
      console.log(`      Insert ID: ${result.insertId}`);
      console.log(`      Affected rows: ${result.affectedRows}`);
      
      // Verify the ticket was actually inserted
      const [verifyTicket] = await connection.execute('SELECT * FROM tickets WHERE id = ?', [result.insertId]);
      
      if (verifyTicket.length > 0) {
        const inserted = verifyTicket[0];
        console.log('   ✅ Verification successful:');
        console.log(`      ID: ${inserted.id}`);
        console.log(`      Ticket #: ${inserted.jd_ticket_number}`);
        console.log(`      Description: ${inserted.description}`);
        console.log(`      Status: ${inserted.status}`);
        console.log(`      Created at: ${inserted.created_at}`);
        console.log(`      Updated at: ${inserted.updated_at}`);
      } else {
        console.log('   ❌ Verification failed - ticket not found after insertion');
      }
      
    } catch (error) {
      console.log('   ❌ Ticket insertion failed:', error.message);
      console.log('   Error details:', error);
    }
    
    // 5. Test duplicate ticket number handling
    console.log('\n5. 🔄 Duplicate Ticket Number Test');
    
    try {
      console.log('   Attempting to insert duplicate ticket number...');
      
      const [duplicateResult] = await connection.execute(insertQuery, [
        testTicket.description + ' (duplicate)',
        testTicket.jd_ticket_number, // Same ticket number
        testTicket.category,
        testTicket.updates_comments,
        testTicket.priority,
        testTicket.date_opening,
        testTicket.date_closed,
        testTicket.status,
        testTicket.assignee,
        testTicket.manager,
        testTicket.due_date
      ]);
      
      console.log('   ⚠️ Duplicate insertion succeeded (this might indicate a problem)');
      console.log(`      Insert ID: ${duplicateResult.insertId}`);
      
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('   ✅ Duplicate correctly rejected by database constraint');
      } else {
        console.log('   ❌ Unexpected error on duplicate test:', error.message);
      }
    }
    
    // 6. Check database permissions
    console.log('\n6. 🔐 Database Permissions Check');
    
    try {
      const [permissions] = await connection.execute('SHOW GRANTS FOR CURRENT_USER()');
      console.log('   Current user permissions:');
      permissions.forEach(grant => {
        console.log(`      ${Object.values(grant)[0]}`);
      });
    } catch (error) {
      console.log('   ⚠️ Could not check permissions:', error.message);
    }
    
    // 7. Final ticket count
    console.log('\n7. 📊 Final Database State');
    
    const [finalTickets] = await connection.execute('SELECT COUNT(*) as count FROM tickets');
    console.log(`   Total tickets in database: ${finalTickets[0].count}`);
    
    const [recentTickets] = await connection.execute('SELECT id, jd_ticket_number, description, created_at FROM tickets ORDER BY created_at DESC LIMIT 3');
    console.log('   Most recent tickets:');
    recentTickets.forEach(ticket => {
      console.log(`      - ${ticket.jd_ticket_number}: ${ticket.description.slice(0, 30)}... (${ticket.created_at})`);
    });
    
    console.log('\n8. 💡 Troubleshooting Recommendations');
    
    if (finalTickets[0].count > 0) {
      console.log('   ✅ Database insertion works - issue might be in:');
      console.log('      - Frontend form submission');
      console.log('      - API endpoint authentication');
      console.log('      - Request payload format');
      console.log('      - Network connectivity');
      console.log('      - Server error handling');
    } else {
      console.log('   ❌ No tickets in database - check:');
      console.log('      - Database connection');
      console.log('      - Table permissions');
      console.log('      - SQL syntax');
      console.log('      - Database constraints');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Check browser console for JavaScript errors');
    console.log('   2. Check Network tab for failed API requests');
    console.log('   3. Verify user is logged in and has proper permissions');
    console.log('   4. Test API endpoint directly with curl or Postman');
    console.log('   5. Check server logs for error messages');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main function
async function main() {
  await debugTicketCreation();
}

// Run main function
main().catch(console.error);
