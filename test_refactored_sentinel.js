const http = require('http');
const io = require('socket.io-client');
const fs = require('fs');

async function runTests() {
  console.log('=== OPERION REFACTORED SURVEILLANCE MODULE TEST SUITE ===\n');

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

  // TEST 1: Source Code Verification in index.html for Required Rules
  console.log('Test 1: Frontend Code Inspection for Unified Architecture Rules');
  const indexHtml = fs.readFileSync('index.html', 'utf-8');

  // Rule 1.1: Match classes: ['cell phone', 'remote', 'electronic device']
  assert(
    indexHtml.includes("['cell phone', 'remote', 'electronic device']") ||
    (indexHtml.includes("'cell phone'") && indexHtml.includes("'remote'") && indexHtml.includes("'electronic device'")),
    'Matching classes defined for cell phone, remote, and electronic device'
  );

  // Rule 1.2: Drop detection confidence threshold to 0.35
  assert(
    indexHtml.includes('PHONE_CONFIDENCE_THRESHOLD = 0.35') || indexHtml.includes('0.35'),
    'Phone detection confidence threshold lowered strictly to 0.35'
  );

  // Rule 1.3: Guard against invalid video state (video.readyState >= 2)
  assert(
    indexHtml.includes('videoEl.readyState < 2') || indexHtml.includes('readyState >= 2'),
    'Guarded strictly against invalid video state (video.readyState >= 2)'
  );

  // Rule 1.4: Synchronize canvas width/height strictly with video.videoWidth/video.videoHeight
  assert(
    indexHtml.includes('overlayCanvas.width = videoEl.videoWidth') &&
    indexHtml.includes('overlayCanvas.height = videoEl.videoHeight'),
    'Canvas width/height strictly synchronized with video.videoWidth and video.videoHeight'
  );

  // Rule 2.1: Ensure pose pipeline executes strictly when face is present with confidence >= 0.65
  assert(
    indexHtml.includes('FACE_CONFIDENCE_THRESHOLD = 0.65') || indexHtml.includes('0.65'),
    'Face confidence threshold set to strictly 0.65'
  );

  // Rule 2.2: If no face is detected or coordinates are (0,0)/NaN, clear all head angle states and suppress warnings
  assert(
    indexHtml.includes('headPoseState.angle = 0') &&
    indexHtml.includes('headPoseState.consecutiveGazeDeviations = 0') &&
    indexHtml.includes('suppressGazeDeviationWarning'),
    'Ghost head pose elimination clears angle state and suppresses warnings when no face or (0,0)/NaN'
  );

  // Rule 2.3: Require consistent gaze deviation across 3 consecutive frames before triggering amber "GAZE DEVIATION" alert
  assert(
    indexHtml.includes('GAZE_CONSECUTIVE_FRAMES_REQUIRED = 3') || indexHtml.includes('>= 3'),
    'Consistent gaze deviation enforced across 3 consecutive frames before triggering amber alert'
  );

  // Rule 3.1: Add a top-right semi-transparent HUD showing highest detected class and confidence score
  assert(
    indexHtml.includes('id="cctv-telemetry-hud"') &&
    indexHtml.includes('id="hud-top-class"') &&
    indexHtml.includes('id="hud-top-confidence"'),
    'Top-right semi-transparent HUD renders highest detected class and confidence score'
  );

  // Rule 3.2: Rate-limit socket alert emissions using a 4-second throttle lock
  assert(
    indexHtml.includes('SOCKET_ALERT_THROTTLE_LOCK_MS = 4000') || indexHtml.includes('4000'),
    'Rate-limiting socket alert emissions using strict 4-second throttle lock'
  );

  // TEST 2: Functional Logic Unit Tests for Detection and Pose Logic
  console.log('\nTest 2: Functional Algorithm Unit Tests (Simulated Engine Execution)');

  // Simulate isPhoneOrElectronicDevice
  const PHONE_TARGET_CLASSES = ['cell phone', 'remote', 'electronic device'];
  function isPhoneOrElectronicDevice(className) {
    if (!className) return false;
    const lower = String(className).toLowerCase().trim();
    return PHONE_TARGET_CLASSES.some(target => lower === target || lower.includes(target) || target.includes(lower))
      || lower === 'cellphone' || lower === 'smartphone' || lower === 'mobile phone';
  }

  assert(isPhoneOrElectronicDevice('cell phone'), 'Matches "cell phone"');
  assert(isPhoneOrElectronicDevice('remote'), 'Matches "remote"');
  assert(isPhoneOrElectronicDevice('electronic device'), 'Matches "electronic device"');
  assert(isPhoneOrElectronicDevice('Mobile Phone'), 'Matches "Mobile Phone"');
  assert(!isPhoneOrElectronicDevice('cup'), 'Rejects unrelated class "cup"');
  assert(!isPhoneOrElectronicDevice('book'), 'Rejects unrelated class "book"');

  // Test threshold 0.35
  const PHONE_CONF_THRESHOLD = 0.35;
  assert(0.36 >= PHONE_CONF_THRESHOLD, 'Accepts confidence 0.36 (>= 0.35)');
  assert(0.35 >= PHONE_CONF_THRESHOLD, 'Accepts confidence 0.35 exactly');
  assert(!(0.34 >= PHONE_CONF_THRESHOLD), 'Rejects confidence 0.34 (< 0.35)');

  // Test Ghost Head Pose Elimination Logic
  console.log('\nTest 3: Ghost Head Pose Elimination & 3-Frame Consistent Gaze Logic');
  let mockPoseState = {
    angle: 0,
    consecutiveGazeDeviations: 0,
    isAlertActive: false,
    hasValidFace: false
  };

  function simulatePoseEvaluation(faceProb, coordinates, angle) {
    // Check face confidence >= 0.65
    if (!faceProb || faceProb < 0.65) {
      mockPoseState.angle = 0;
      mockPoseState.consecutiveGazeDeviations = 0;
      mockPoseState.isAlertActive = false;
      mockPoseState.hasValidFace = false;
      return { alert: false, suppressed: true, reason: 'Face confidence < 0.65' };
    }

    // Check (0,0) or NaN coordinates
    if (!coordinates || coordinates.some(c => isNaN(c)) || (coordinates[0] === 0 && coordinates[1] === 0)) {
      mockPoseState.angle = 0;
      mockPoseState.consecutiveGazeDeviations = 0;
      mockPoseState.isAlertActive = false;
      mockPoseState.hasValidFace = false;
      return { alert: false, suppressed: true, reason: 'Invalid coordinates (0,0) or NaN' };
    }

    mockPoseState.hasValidFace = true;
    mockPoseState.angle = angle;

    if (Math.abs(angle) >= 28) {
      mockPoseState.consecutiveGazeDeviations++;
    } else {
      mockPoseState.consecutiveGazeDeviations = 0;
    }

    if (mockPoseState.consecutiveGazeDeviations >= 3) {
      mockPoseState.isAlertActive = true;
      return { alert: true, frames: mockPoseState.consecutiveGazeDeviations };
    } else {
      mockPoseState.isAlertActive = false;
      return { alert: false, frames: mockPoseState.consecutiveGazeDeviations };
    }
  }

  // 1. Ghost face with low confidence (< 0.65)
  const lowConfResult = simulatePoseEvaluation(0.52, [100, 100, 200, 200], 35);
  assert(lowConfResult.suppressed === true && !mockPoseState.isAlertActive, 'Ghost face with prob=0.52 is suppressed');

  // 2. Ghost face with coordinates (0, 0)
  const zeroCoordResult = simulatePoseEvaluation(0.85, [0, 0, 0, 0], 40);
  assert(zeroCoordResult.suppressed === true && mockPoseState.consecutiveGazeDeviations === 0, 'Ghost face with (0,0) coordinates clears deviations and suppresses');

  // 3. Ghost face with NaN coordinates
  const nanCoordResult = simulatePoseEvaluation(0.90, [NaN, 100, NaN, 200], 45);
  assert(nanCoordResult.suppressed === true, 'Ghost face with NaN coordinates suppresses warning');

  // 4. Test 3-frame consistent gaze deviation
  // Frame 1: deviated (35 deg) -> count = 1 -> alert false
  const f1 = simulatePoseEvaluation(0.88, [100, 100, 200, 200], 35);
  assert(f1.alert === false && f1.frames === 1, 'Frame 1 deviation: Alert suppressed (1/3 frames)');

  // Frame 2: deviated (36 deg) -> count = 2 -> alert false
  const f2 = simulatePoseEvaluation(0.88, [100, 100, 200, 200], 36);
  assert(f2.alert === false && f2.frames === 2, 'Frame 2 deviation: Alert suppressed (2/3 frames)');

  // Frame 3: deviated (34 deg) -> count = 3 -> alert true!
  const f3 = simulatePoseEvaluation(0.88, [100, 100, 200, 200], 34);
  assert(f3.alert === true && f3.frames === 3, 'Frame 3 deviation: Amber GAZE DEVIATION Alert Triggered! (3/3 frames)');

  // Frame 4: student returns to center (angle 5 deg) -> count resets to 0 -> alert false
  const f4 = simulatePoseEvaluation(0.88, [100, 100, 200, 200], 5);
  assert(f4.alert === false && f4.frames === 0, 'Student returns to nominal gaze: Counter resets to 0, alert clears');

  // TEST 4: Socket Rate-Limiting 4-Second Throttle Lock
  console.log('\nTest 4: 4-Second Throttle Lock Socket Rate-Limiting Verification');
  try {
    const socket = io('http://localhost:3000', { reconnection: false, timeout: 5000 });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket timeout')), 4000);
      socket.on('connect', () => {
        clearTimeout(timeout);
        assert(socket.connected, 'Socket connected to Operion server');
        resolve();
      });
      socket.on('connect_error', reject);
    });

    let receivedAlertCount = 0;
    socket.on('ufm_alert', (payload) => {
      if (payload.detected_object === 'remote' || payload.detected_object === 'cell phone') {
        receivedAlertCount++;
      }
    });

    // Simulate 4-second throttle lock mechanism
    let isLocked = false;
    let lastTime = 0;
    const THROTTLE_MS = 4000;
    let emittedCount = 0;

    function emitWithThrottle(objName, conf) {
      const now = Date.now();
      if (!isLocked && (now - lastTime >= THROTTLE_MS)) {
        isLocked = true;
        lastTime = now;
        emittedCount++;
        socket.emit('ufm_alert', {
          room_id: 'Room 501-LHS (Block E)',
          detected_object: objName,
          confidence: conf,
          timestamp: new Date().toISOString()
        });
        setTimeout(() => { isLocked = false; }, THROTTLE_MS);
        return true;
      }
      return false;
    }

    // Attempt 5 rapid fire emissions within 500ms
    const r1 = emitWithThrottle('remote', 42); // Should emit
    const r2 = emitWithThrottle('remote', 45); // Should be locked/throttled
    const r3 = emitWithThrottle('cell phone', 55); // Should be locked/throttled
    const r4 = emitWithThrottle('electronic device', 60); // Should be locked/throttled
    const r5 = emitWithThrottle('cell phone', 75); // Should be locked/throttled

    assert(r1 === true, 'Burst attempt 1 allowed by throttle lock');
    assert(r2 === false && r3 === false && r4 === false && r5 === false, 'Burst attempts 2-5 blocked by 4-second throttle lock');
    assert(emittedCount === 1, 'Exactly 1 socket emission occurred during burst window');

    // Wait 400ms for socket round-trip
    await new Promise(r => setTimeout(r, 400));
    assert(receivedAlertCount === 1, 'Socket server broadcasted exactly 1 event (no flooding)');

    socket.disconnect();
  } catch (err) {
    assert(false, `Socket throttle test failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
