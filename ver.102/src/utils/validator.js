export function validateSnapshotData(characterData) {
  if (!characterData || typeof characterData !== 'object') {
    return { valid: false, message: 'Invalid Character Data' };
  }

  const level = Math.max(1, Number(characterData.lvl || characterData.level || 1));
  const power = Number(characterData.power || 0);

  const snap = characterData.snap || characterData.data?.snap || {};
  const hp = Number(snap.hp || snap.maxHp || 0);
  const def = Number(snap.def || 0);
  const dps = Number(snap.dps || 0);

  const maxPower = level * 10000 + 50000;
  const maxHp = level * 5000 + 30000;
  const maxDef = level * 1500 + 10000;
  const maxDps = level * 8000 + 40000;

  if (power > maxPower) {
    console.warn(`[Security] Stat Anomaly Detected: Power ${power} exceeds maxPower ${maxPower} for level ${level} (Owner: ${characterData.owner || 'unknown'})`);
    return { valid: false, message: 'Stat Anomaly Detected: Power exceeds boundary' };
  }

  if (hp > maxHp) {
    console.warn(`[Security] Stat Anomaly Detected: HP ${hp} exceeds maxHp ${maxHp} for level ${level} (Owner: ${characterData.owner || 'unknown'})`);
    return { valid: false, message: 'Stat Anomaly Detected: HP exceeds boundary' };
  }

  if (def > maxDef) {
    console.warn(`[Security] Stat Anomaly Detected: DEF ${def} exceeds maxDef ${maxDef} for level ${level} (Owner: ${characterData.owner || 'unknown'})`);
    return { valid: false, message: 'Stat Anomaly Detected: DEF exceeds boundary' };
  }

  if (dps > maxDps) {
    console.warn(`[Security] Stat Anomaly Detected: DPS ${dps} exceeds maxDps ${maxDps} for level ${level} (Owner: ${characterData.owner || 'unknown'})`);
    return { valid: false, message: 'Stat Anomaly Detected: DPS exceeds boundary' };
  }

  return { valid: true };
}
