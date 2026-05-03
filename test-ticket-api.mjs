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

async function testTicketAPI() {
  let connection;
  
  try {
    console.log('🧪 TESTING TICKET API ENDPOINT');
    console.log('================================\n');
    
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 1. Check current ticket count
    console.log('1. 📊 Current Database State');
    const [currentTickets] = await connection.execute('SELECT COUNT(*) as count FROM tickets');
    console.log(`   Current tickets: ${currentTickets[0].count}`);
    
    // 2. Test login to get session
    console.log('\n2. 🔐 Testing Login for Session');
    
    // First, let's simulate a login to get the session setup
    const testUser = await connection.execute('SELECT * FROM user_accounts WHERE LOWER(name) = LOWER(?)', ['zacarias']);
    
    if (testUser.length === 0) {
      console.log('   ❌ zacarias user not found');
      return;
    }
    
    const user = testUser[0];
    console.log(`   ✅ Found user: ${user.name} (${user.role})`);
    
    // 3. Test direct API call simulation
    console.log('\n3. 🌐 Simulating API Call');
    
    const testPayload = {
      description: 'Test ticket from API simulation',
      jd_ticket_number: 'API-SIM-' + Date.now(),
      category: 'Technical',
      updates_comments: 'Test comment from API simulation',
      priority: 'P2 medium',
      status: 'Open',
      date_opening: new Date().toISOString().slice(0, 19).replace('T', ' '),
      date_closed: '',
      assignee: 'zacarias',
      manager: 'zacarias'
    };
    
    console.log('   Test payload:');
    console.log(`      Description: ${testPayload.description}`);
    console.log(`      Ticket #: ${testPayload.jd_ticket_number}`);
    console.log(`      Category: ${testPayload.category}`);
    console.log(`      Priority: ${testPayload.priority}`);
    console.log(`      Assignee: ${testPayload.assignee}`);
    
    // 4. Test the exact same logic as the server
    console.log('\n4. 🔧 Testing Server Logic');
    
    try {
      // Simulate the server's normalizeTicketInput and insertion
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      
      // Check for duplicate
      const [existing] = await connection.execute('SELECT * FROM tickets WHERE jd_ticket_number = ?', [testPayload.jd_ticket_number]);
      if (existing.length > 0) {
        console.log('   ⚠️ Duplicate ticket number found');
      } else {
        console.log('   ✅ No duplicate found');
      }
      
      // Insert the ticket using the exact same query as the server
      const insertQuery = `
        INSERT INTO tickets (
          description, jd_ticket_number, category, updates_comments, priority, 
          date_opening, date_closed, status, assignee, manager, due_date, 
          reopened_count, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
      `;
      
      const [result] = await connection.execute(insertQuery, [
        testPayload.description,
        testPayload.jd_ticket_number,
        testPayload.category,
        testPayload.updates_comments,
        testPayload.priority,
        testPayload.date_opening,
        testPayload.date_closed,
        testPayload.status,
        testPayload.assignee,
        testPayload.manager,
        dueDate
      ]);
      
      console.log('   ✅ Ticket inserted successfully!');
      console.log(`      Insert ID: ${result.insertId}`);
      console.log(`      Affected rows: ${result.affectedRows}`);
      
      // Verify the ticket
      const [verifyTicket] = await connection.execute('SELECT * FROM tickets WHERE id = ?', [result.insertId]);
      
      if (verifyTicket.length > 0) {
        const inserted = verifyTicket[0];
        console.log('   ✅ Verification successful:');
        console.log(`      ID: ${inserted.id}`);
        console.log(`      Ticket #: ${inserted.jd_ticket_number}`);
        console.log(`      Description: ${inserted.description}`);
        console.log(`      Status: ${inserted.status}`);
        console.log(`      Created at: ${inserted.created_at}`);
      } else {
        console.log('   ❌ Verification failed');
      }
      
    } catch (error) {
      console.log('   ❌ Insertion failed:', error.message);
      console.log('   Error details:', error);
    }
    
    // 5. Check final state
    console.log('\n5. 📊 Final Database State');
    
    const [finalTickets] = await connection.execute('SELECT COUNT(*) as count FROM tickets');
    console.log(`   Final tickets: ${finalTickets[0].count}`);
    console.log(`   New tickets created: ${finalTickets[0].count - currentTickets[0].count}`);
    
    const [recentTickets] = await connection.execute('SELECT id, jd_ticket_number, description, created_at FROM tickets ORDER BY created_at DESC LIMIT 3');
    console.log('   Most recent tickets:');
    recentTickets.forEach(ticket => {
      console.log(`      - ${ticket.jd_ticket_number}: ${ticket.description.slice(0, 30)}... (${ticket.created_at})`);
    });
    
    // 6. Frontend debugging tips
    console.log('\n6. 💡 Frontend Debugging Tips');
    console.log('   If tickets are not saving from the UI:');
    console.log('   1. Check browser console (F12) for JavaScript errors');
    console.log('   2. Check Network tab for failed requests to /api/tickets');
    console.log('   3. Verify user is logged in (state.currentUser)');
    console.log('   4. Verify CSRF token is present (state.csrfToken)');
    console.log('   5. Check if form validation is passing');
    console.log('   6. Look for 401/403/500 status codes in Network tab');
    
    console.log('\n7. 🔍 Quick Frontend Test');
    console.log('   Open browser console and run:');
    console.log('   console.log("Current user:", state.currentUser);');
    console.log('   console.log("CSRF token:", state.csrfToken);');
    console.log('   console.log("Form elements:", {');
    console.log('     description: document.querySelector("#description")?.value,');
    console.log('     jd_ticket_number: document.querySelector("#jd_ticket_number")?.value,');
    console.log('     category: document.querySelector("#category")?.value');
    console.log('   });');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main function
async function main() {
  await testTicketAPI();
}

// Run main function
main().catch(console.error);
