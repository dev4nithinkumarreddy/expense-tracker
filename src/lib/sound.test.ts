import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { playTapSound, playSuccessSound, playDeleteSound, _setAudioContext } from './sound';
import { useExpenseStore } from '../store/useExpenseStore';

class MockGainNode {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class MockOscillatorNode {
  type = 'sine';
  frequency = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  currentTime = 0;
  state = 'running';
  destination = {};
  createGain = vi.fn(() => new MockGainNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
  resume = vi.fn();
}

describe('sound.ts - Web Audio Sound FX', () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    mockCtx = new MockAudioContext();
    _setAudioContext(mockCtx as unknown as AudioContext);

    useExpenseStore.setState({
      settings: {
        currency: '₹',
        monthlyIncome: 50000,
        categories: ['Food', 'Bills'],
        quickAdds: [],
        soundEnabled: true,
        privacyMode: false,
        darkMode: false,
        carryForward: false,
        categoryBudgets: {},
      },
    });
  });

  afterEach(() => {
    _setAudioContext(null);
  });

  it('plays tap click sound when soundEnabled is true', () => {
    playTapSound();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
    expect(mockCtx.createGain).toHaveBeenCalled();
  });

  it('plays success chime when soundEnabled is true', () => {
    playSuccessSound();
    // playSuccessSound creates two oscillator tones (D5 and A5)
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockCtx.createGain).toHaveBeenCalledTimes(2);
  });

  it('plays delete sound when soundEnabled is true', () => {
    playDeleteSound();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
    expect(mockCtx.createGain).toHaveBeenCalled();
  });

  it('remains completely silent when soundEnabled is false', () => {
    useExpenseStore.setState({
      settings: {
        currency: '₹',
        monthlyIncome: 50000,
        categories: ['Food'],
        quickAdds: [],
        soundEnabled: false,
        privacyMode: false,
        darkMode: false,
        carryForward: false,
        categoryBudgets: {},
      },
    });

    playTapSound();
    playSuccessSound();
    playDeleteSound();

    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    expect(mockCtx.createGain).not.toHaveBeenCalled();
  });

  it('resumes suspended audio context on user interaction', () => {
    mockCtx.state = 'suspended';
    playTapSound();
    expect(mockCtx.resume).toHaveBeenCalled();
  });
});
