const fetch = require('node-fetch');

async function testUserRegistration() {
  try {
    console.log('Testing user registration...');
    console.log('Sending request to: http://localhost:5000/api/users');

    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    console.log('Request body:', JSON.stringify(userData));

    const response = await fetch('http://localhost:5000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response body:', data);

    if (data.token) {
      console.log('User registered successfully!');
      return data.token;
    } else {
      console.log('Registration failed.');
      return null;
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

async function testCreateNote(token) {
  try {
    console.log('\nTesting note creation...');

    if (!token) {
      console.log('No token available, skipping note creation test.');
      return null;
    }

    const noteData = {
      title: 'Test Note',
      content: 'This is a test note created via API.',
      tags: ['test', 'api']
    };

    console.log('Sending request to: http://localhost:5000/api/notes');
    console.log('Request body:', JSON.stringify(noteData));

    const response = await fetch('http://localhost:5000/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(noteData)
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response body:', data);

    if (data._id) {
      console.log('Note created successfully!');
      return data._id;
    } else {
      console.log('Note creation failed.');
      return null;
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

async function testCreateMindmap(token) {
  try {
    console.log('\nTesting mindmap creation...');

    if (!token) {
      console.log('No token available, skipping mindmap creation test.');
      return null;
    }

    const mindmapData = {
      title: 'Test Mindmap',
      description: 'This is a test mindmap created via API.',
      rootNode: {
        id: 'root',
        text: 'Main Topic',
        children: [
          {
            id: 'child1',
            text: 'Subtopic 1',
            children: []
          },
          {
            id: 'child2',
            text: 'Subtopic 2',
            children: []
          }
        ]
      },
      tags: ['test', 'mindmap']
    };

    console.log('Sending request to: http://localhost:5000/api/mindmaps');
    console.log('Request body:', JSON.stringify(mindmapData));

    const response = await fetch('http://localhost:5000/api/mindmaps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(mindmapData)
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response body:', data);

    if (data._id) {
      console.log('Mindmap created successfully!');
      return data._id;
    } else {
      console.log('Mindmap creation failed.');
      return null;
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

async function runTests() {
  try {
    // Step 1: Register a user
    const token = await testUserRegistration();

    // Step 2: Create a note
    const noteId = await testCreateNote(token);

    // Step 3: Create a mindmap
    const mindmapId = await testCreateMindmap(token);

    console.log('\nTest Summary:');
    console.log('-------------');
    console.log('Authentication:', token ? 'SUCCESS' : 'FAILED');
    console.log('Note Creation:', noteId ? 'SUCCESS' : 'FAILED');
    console.log('Mindmap Creation:', mindmapId ? 'SUCCESS' : 'FAILED');
  } catch (error) {
    console.error('Test run failed:', error.message);
    console.error('Full error:', error);
  }
}

// Install node-fetch if needed
try {
  require.resolve('node-fetch');
  runTests();
} catch (e) {
  console.log('node-fetch is not installed. Please run "npm install node-fetch" first.');
} 