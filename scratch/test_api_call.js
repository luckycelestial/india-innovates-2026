async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'select',
        table: 'departments',
        selects: '*',
        filters: []
      })
    });
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Response JSON:', json);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

test();
