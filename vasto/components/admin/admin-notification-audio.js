export function playAdminSound(context, volume = 40) {
  if (!context || context.state !== 'running' || volume <= 0) return false;
  [660,880].forEach((frequency,index) => {
    const oscillator=context.createOscillator();const gain=context.createGain();
    const start=context.currentTime+index*.18;
    oscillator.type='sine';oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(Math.max(.001,.2*volume/100),start+.02);gain.gain.exponentialRampToValueAtTime(.001,start+.28);
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.3);
  });
  return true;
}
