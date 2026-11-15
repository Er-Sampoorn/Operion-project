const http = require('http');
const io = require('socket.io-client');

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== OPERION FEATURE VERIFICATION TEST SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // TEST 1: GET /api/seating/sample
  console.log('Test 1: Verification of /api/seating/sample schema');
  try {
    const sampleRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/seating/sample',
      method: 'GET'
    });
    assert(sampleRes.status === 200, 'Sample seating endpoint returns HTTP 200');
    assert(sampleRes.body.sample_csv && sampleRes.body.sample_csv.includes('year'), 'Sample CSV includes "year" column');
    assert(sampleRes.body.total_candidates === 30, 'Sample CSV provides 30 candidates');
  } catch (err) {
    assert(false, `Sample endpoint failed: ${err.message}`);
  }

  // TEST 2: Strict 8-Directional Chebyshev Exclusion Seating Allocation
  console.log('\nTest 2: Strict 8-Directional Chebyshev Constraint Satisfaction Seating Engine');
  try {
    // Generate sample candidates with CSE, ECE, ME, CE and batches 2022, 2023, 2024
    const candidates = [];
    const branches = ['CSE', 'ECE', 'ME', 'CE'];
    const years = ['2022', '2023', '2024'];
    for (let i = 1; i <= 30; i++) {
      const b = branches[i % branches.length];
      const y = years[i % years.length];
      candidates.push({
        roll_no: `${y.slice(2)}${b}${String(i).padStart(3, '0')}`,
        name: `Candidate ${i}`,
        branch: b,
        paper_code: `${b}-${y.slice(2)}01`,
        year: y
      });
    }

    const rows = 5;
    const cols = 6;
    const genRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/seating/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      hall_name: 'Room 501-LHS (Block E)',
      rows,
      cols,
      students: candidates
    });

    assert(genRes.status === 200, 'Seating generate returns HTTP 200');
    const result = genRes.body;
    assert(result.success === true, 'Response indicates success');
    assert(result.algorithm === 'csp_8directional_chebyshev_exclusion', 'Uses 8-directional Chebyshev algorithm');
    assert(result.conflicts === 0, 'Algorithm guarantees exactly 0 Chebyshev conflicts');
    assert(result.grid && result.grid.length === rows, `Grid has ${rows} rows`);
    assert(result.grid[0].length === cols, `Grid has ${cols} columns`);

    // Verify 8-directional Chebyshev distance of 1 for all placed students
    let manualChebyshevViolations = 0;
    const grid = result.grid;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const current = grid[r][c];
        if (!current || current.empty) continue;

        // Check all 8 directions
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              const neighbor = grid[nr][nc];
              if (neighbor && !neighbor.empty) {
                const curKey = `${current.branch} - ${current.year}`;
                const nbKey = `${neighbor.branch} - ${neighbor.year}`;
                if (curKey === nbKey) {
                  manualChebyshevViolations++;
                  console.error(`Violation at (${r},${c}) [${curKey}] and (${nr},${nc}) [${nbKey}]`);
                }
              }
            }
          }
        }
      }
    }
    assert(manualChebyshevViolations === 0, 'Manual 8-directional scan confirms 0 Chebyshev conflicts');

    // TEST 3: Fallback Strategy for Empty Buffer Seats
    console.log('\nTest 3: Fallback Strategy for Constrained / Exhausted Seats (EMPTY BUFFER SEAT)');
    // If we only provide 1 branch with the same year (e.g. 10 CSE - 2022 students in a 3x3 grid)
    // No two CSE-2022 can sit within distance 1 of each other!
    const singleBranchStudents = [];
    for (let i = 1; i <= 10; i++) {
      singleBranchStudents.push({
        roll_no: `22CSE${String(i).padStart(3, '0')}`,
        name: `CSE Student ${i}`,
        branch: 'CSE',
        year: '2022',
        paper_code: 'CS-402'
      });
    }

    const testGridRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/seating/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      hall_name: 'Room 501-LHS (Block E)',
      rows: 3,
      cols: 3,
      students: singleBranchStudents
    });

    const fallbackResult = testGridRes.body;
    assert(fallbackResult.conflicts === 0, 'Single branch grid maintains 0 Chebyshev conflicts');
    assert(fallbackResult.buffer_seats > 0, `Buffer seats are correctly created when constraints prevent placement (Buffer count: ${fallbackResult.buffer_seats})`);
    
    // Verify that every buffer seat is marked with empty: true and has a proper desk label (e.g., A-01)
    let bufferSeatsHaveLabels = true;
    fallbackResult.grid.flat().forEach(cell => {
      if (cell.empty) {
        if (!cell.seat || !cell.seat.match(/^[A-Z]-\d{2}$/)) {
          bufferSeatsHaveLabels = false;
        }
      }
    });
    assert(bufferSeatsHaveLabels, 'All empty buffer seats retain consistent desk labeling (e.g., A-01, A-02)');

  } catch (err) {
    assert(false, `Seating engine test failed: ${err.message}`);
  }

  // TEST 4: Real-Time Mobile Phone Detection Socket & SQLite UFM Auto-Drafting
  console.log('\nTest 4: Real-Time Mobile Phone Detection (Socket.io ufm_alert & Form 7-UFM Auto-Drafting)');
  try {
    const socket = io('http://localhost:3000', { reconnection: false, timeout: 5000 });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 4000);
      socket.on('connect', () => {
        clearTimeout(timeout);
        assert(socket.connected, 'Socket.io client connected successfully');
        resolve();
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Test receiving ufm_alert and ufm:created broadcast
    const alertReceivedPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('ufm_alert broadcast timeout')), 5000);
      socket.on('ufm_alert', (payload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });

    const testAlertPayload = {
      room_id: 'Room 501-LHS (Block E)',
      detected_object: 'cell phone',
      confidence: 92,
      timestamp: new Date().toISOString(),
      snapshot_url: 'data:image/jpeg;base64,TEST_FRAME_DATA',
      roll_no: 'OP-2024-8924',
      student_name: 'Vikramaditya Rao',
      desk: 'Desk A-02'
    };

    socket.emit('ufm_alert', testAlertPayload);

    const receivedAlert = await alertReceivedPromise;
    assert(receivedAlert.detected_object === 'cell phone', 'Socket received ufm_alert with detected_object "cell phone"');
    assert(receivedAlert.confidence === 92, 'Confidence score 92% accurately transmitted');
    assert(receivedAlert.room_id === 'Room 501-LHS (Block E)', 'Target room accurately matched');
    assert(receivedAlert.docket_no && receivedAlert.docket_no.startsWith('UFM/2024/'), `Statutory docket auto-generated: ${receivedAlert.docket_no}`);

    // Verify SQLite persistence in /api/ufm
    const ufmRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ufm',
      method: 'GET'
    });

    assert(ufmRes.status === 200, 'GET /api/ufm returns HTTP 200');
    const incidents = ufmRes.body.incidents || [];
    const autoDraftedCase = incidents.find(inc => inc.docket_no === receivedAlert.docket_no);
    assert(autoDraftedCase !== undefined, `Auto-drafted incident found in SQLite with docket ${receivedAlert.docket_no}`);
    if (autoDraftedCase) {
      assert(autoDraftedCase.malpractice_type === 'Smart Device / Mobile Confiscated', 'Malpractice category correctly cites "Smart Device / Mobile Confiscated"');
      assert(autoDraftedCase.evidence_notes.includes('cell phone'), 'Evidence notes document cell phone detection');
    }

    socket.disconnect();
  } catch (err) {
    assert(false, `Mobile phone detection socket test failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
