/*
 * Database Setup Script
 * 
 * This script helps set up the initial database for the application.
 * It creates a sample user for testing purposes.
 */

const { hashPassword } = require('./server/utils/authUtils');
const { prisma } = require('./lib/prisma');

async function setupDatabase() {
  try {
    // Create a sample user for testing
    const hashedPassword = await hashPassword('password123');
    
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        uname: 'testuser',
        email: 'test@example.com',
        password: hashedPassword
      }
    });
    
    console.log('Database setup completed successfully!');
    console.log('Sample user created:');
    console.log('- Email: test@example.com');
    console.log('- Password: password123');
    console.log('- Username: testuser');
    
    // Create another sample user
    const hashedPassword2 = await hashPassword('mypassword');
    
    const user2 = await prisma.user.create({
      data: {
        name: 'Jane Smith',
        uname: 'janesmith',
        email: 'jane@example.com',
        password: hashedPassword2
      }
    });
    
    console.log('\nSecond sample user created:');
    console.log('- Email: jane@example.com');
    console.log('- Password: mypassword');
    console.log('- Username: janesmith');
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('Sample users already exist in the database.');
    } else {
      console.error('Error setting up database:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup function
setupDatabase();