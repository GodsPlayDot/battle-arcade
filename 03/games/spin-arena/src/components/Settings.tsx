import React, { useState, useEffect } from 'react';
import type { GameSettings, Preset } from '../types';
import { DEFAULT_SETTINGS, RECOMMENDED_PRESETS } from '../constants';
import { Save, Upload, RotateCcw, Trash2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface SettingsProps {
  initialSettings: GameSettings;
  onSave: (settings: GameSettings) => void;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ initialSettings, onSave, onClose }) => {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const [activeCategory, setActiveCategory] = useState<string | null>('Arena Controls');
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('customPresets');
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load presets", e);
      }
    }
  }, []);

  const savePresetsToStorage = (presets: Preset[]) => {
    setCustomPresets(presets);
    localStorage.setItem('customPresets', JSON.stringify(presets));
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleResetAll = () => {
    if (confirm("Reset all settings to default?")) {
      setSettings(DEFAULT_SETTINGS);
    }
  };

  const handleResetSetting = (key: keyof GameSettings) => {
    setSettings(prev => ({ ...prev, [key]: DEFAULT_SETTINGS[key] }));
  };

  const handleSliderChange = (key: keyof GameSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: Number(value) }));
  };

  const handleToggleChange = (key: keyof GameSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectChange = (key: keyof GameSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const newPreset: Preset = { name: presetName, settings: { ...settings } };
    const updated = [...customPresets, newPreset];
    savePresetsToStorage(updated);
    setPresetName('');
  };

  const handleLoadPreset = (p: Preset) => {
    setSettings(p.settings);
    setShowPresetMenu(false);
  };

  const handleDeletePreset = (index: number) => {
    const updated = customPresets.filter((_, i) => i !== index);
    savePresetsToStorage(updated);
  };

  const categories = [
    { name: 'Arena Controls', icon: '🏟️' },
    { name: 'Player Controls', icon: '👤' },
    { name: 'Enemy Controls', icon: '🤖' },
    { name: 'Combat Controls', icon: '⚔️' },
    { name: 'Visual Debug', icon: '🛠️' },
    { name: 'Reference', icon: '📖' },
    { name: 'System Checklist', icon: '✅' },
    { name: 'Specials List', icon: '✨' },
    { name: 'Developer Docs', icon: '👨‍💻' },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-neutral-900 text-neutral-200 rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden border border-neutral-800">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-3xl text-white tracking-tight">Arena Configurator</h1>
            <div className="flex gap-2 ml-4">
              <button 
                onClick={() => handleToggleChange('showRadii')}
                className={`p-2 rounded-lg transition-colors ${settings.showRadii ? 'bg-cyan-500/20 text-cyan-400' : 'bg-neutral-800 text-neutral-500'}`}
                title="Toggle Radii Visibility"
              >
                {settings.showRadii ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
              <button 
                onClick={handleResetAll}
                className="p-2 bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-neutral-500"
                title="Reset All to Default"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors text-sm font-medium"
            >
              <Upload size={16} /> Presets
            </button>
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors text-2xl"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-neutral-800 bg-neutral-950/30 overflow-y-auto p-4 space-y-2">
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  activeCategory === cat.name 
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                    : 'hover:bg-neutral-800 text-neutral-400'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="font-medium">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-neutral-900/20">
            {activeCategory === 'Arena Controls' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-8">
                  <SectionHeader title="Arena Interaction" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Border Speed Loss"
                      value={settings.borderBounceSpeedLoss}
                      min={0} max={100} step={5} unit="%"
                      onChange={(v) => handleSliderChange('borderBounceSpeedLoss', v)}
                      onReset={() => handleResetSetting('borderBounceSpeedLoss')}
                    />
                    <SettingControl
                      label="Border Rotation Loss"
                      value={settings.borderBounceRotationLoss}
                      min={0} max={100} step={5} unit="%"
                      onChange={(v) => handleSliderChange('borderBounceRotationLoss', v)}
                      onReset={() => handleResetSetting('borderBounceRotationLoss')}
                    />
                    <SettingControl
                      label="Corner Escape Timer"
                      value={settings.cornerEscapeTimer}
                      min={0.5} max={5.0} step={0.1} unit="s"
                      onChange={(v) => handleSliderChange('cornerEscapeTimer', v)}
                      onReset={() => handleResetSetting('cornerEscapeTimer')}
                    />
                    <SettingControl
                      label="Tile Min Spawn Dist"
                      value={settings.tileMinSpawnDist}
                      min={50} max={300} step={10} unit="px"
                      onChange={(v) => handleSliderChange('tileMinSpawnDist', v)}
                      onReset={() => handleResetSetting('tileMinSpawnDist')}
                      description="Minimum distance from players when spawning tiles."
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <SectionHeader title="Gravity Well & Maelstrom" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Gravity Radius"
                      value={settings.gravityRadius}
                      min={0} max={15} step={0.5} unit=" Tiles"
                      onChange={(v) => handleSliderChange('gravityRadius', v)}
                      onReset={() => handleResetSetting('gravityRadius')}
                    />
                    <SettingControl
                      label="Gravity Strength"
                      value={settings.gravityStrength}
                      min={-5.0} max={5.0} step={0.1}
                      onChange={(v) => handleSliderChange('gravityStrength', v)}
                      onReset={() => handleResetSetting('gravityStrength')}
                    />
                    <SettingControl
                      label="Maelstrom Duration"
                      value={settings.arenaGravityDuration}
                      min={5} max={60} step={1} unit="s"
                      onChange={(v) => handleSliderChange('arenaGravityDuration', v)}
                      onReset={() => handleResetSetting('arenaGravityDuration')}
                    />
                    <SettingControl
                      label="Maelstrom Cooldown"
                      value={settings.arenaGravityCooldown}
                      min={10} max={300} step={5} unit="s"
                      onChange={(v) => handleSliderChange('arenaGravityCooldown', v)}
                      onReset={() => handleResetSetting('arenaGravityCooldown')}
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <SectionHeader title="Boost Tiles" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Tile Count"
                      value={settings.tileCount}
                      min={0} max={20} step={1}
                      onChange={(v) => handleSliderChange('tileCount', v)}
                      onReset={() => handleResetSetting('tileCount')}
                    />
                    <SettingControl
                      label="Spin Multiplier"
                      value={settings.tileRotationMultiplier}
                      min={1} max={10} step={0.5} unit="x"
                      onChange={(v) => handleSliderChange('tileRotationMultiplier', v)}
                      onReset={() => handleResetSetting('tileRotationMultiplier')}
                    />
                    <SettingControl
                      label="Boost Duration"
                      value={settings.tileBoostDuration}
                      min={1} max={30} step={1} unit="s"
                      onChange={(v) => handleSliderChange('tileBoostDuration', v)}
                      onReset={() => handleResetSetting('tileBoostDuration')}
                    />
                    <SettingControl
                      label="Respawn Time"
                      value={settings.tileRespawnTime}
                      min={1} max={60} step={1} unit="s"
                      onChange={(v) => handleSliderChange('tileRespawnTime', v)}
                      onReset={() => handleResetSetting('tileRespawnTime')}
                    />
                  </div>
                  <ToggleControl
                    label="Random Spawn Locations"
                    active={settings.tileRandomSpawn}
                    onToggle={() => handleToggleChange('tileRandomSpawn')}
                  />
                </div>
              </div>
            )}

            {activeCategory === 'Player Controls' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-8">
                  <SectionHeader title="Core Stats" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Player HP"
                      value={settings.playerHp}
                      min={10} max={500} step={5}
                      onChange={(v) => handleSliderChange('playerHp', v)}
                      onReset={() => handleResetSetting('playerHp')}
                    />
                    <SettingControl
                      label="Player Size"
                      value={settings.playerSize}
                      min={0.5} max={5.0} step={0.1} unit=" Tiles"
                      onChange={(v) => handleSliderChange('playerSize', v)}
                      onReset={() => handleResetSetting('playerSize')}
                    />
                    <SettingControl
                      label="Base Speed"
                      value={settings.playerBaseSpeed}
                      min={0.5} max={10.0} step={0.1}
                      onChange={(v) => handleSliderChange('playerBaseSpeed', v)}
                      onReset={() => handleResetSetting('playerBaseSpeed')}
                    />
                    <SettingControl
                      label="Max Speed"
                      value={settings.playerMaxSpeed}
                      min={1.0} max={20.0} step={0.5}
                      onChange={(v) => handleSliderChange('playerMaxSpeed', v)}
                      onReset={() => handleResetSetting('playerMaxSpeed')}
                    />
                    <SettingControl
                      label="Base Spin"
                      value={settings.playerBaseRotation}
                      min={0.5} max={20.0} step={0.1}
                      onChange={(v) => handleSliderChange('playerBaseRotation', v)}
                      onReset={() => handleResetSetting('playerBaseRotation')}
                    />
                    <SettingControl
                      label="Max Spin"
                      value={settings.playerMaxRotation}
                      min={1.0} max={50.0} step={0.5}
                      onChange={(v) => handleSliderChange('playerMaxRotation', v)}
                      onReset={() => handleResetSetting('playerMaxRotation')}
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <SectionHeader title="Area of Effect" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Push Radius"
                      value={settings.pushRadius}
                      min={0} max={15} step={0.5} unit=" Tiles"
                      onChange={(v) => handleSliderChange('pushRadius', v)}
                      onReset={() => handleResetSetting('pushRadius')}
                    />
                    <SettingControl
                      label="Push Force Strength"
                      value={settings.pushForceStrength}
                      min={0} max={5.0} step={0.1}
                      onChange={(v) => handleSliderChange('pushForceStrength', v)}
                      onReset={() => handleResetSetting('pushForceStrength')}
                    />
                    <SettingControl
                      label="Spin Slow Inside Push"
                      value={settings.rotationSlowInsidePush}
                      min={0} max={50} step={5} unit="%"
                      onChange={(v) => handleSliderChange('rotationSlowInsidePush', v)}
                      onReset={() => handleResetSetting('rotationSlowInsidePush')}
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <SectionHeader title="Specials & Modules" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Shield Duration"
                      value={settings.shieldDuration}
                      min={1} max={10} step={0.5} unit="s"
                      onChange={(v) => handleSliderChange('shieldDuration', v)}
                      onReset={() => handleResetSetting('shieldDuration')}
                    />
                    <SettingControl
                      label="Shield Cooldown"
                      value={settings.shieldCooldown}
                      min={5} max={60} step={1} unit="s"
                      onChange={(v) => handleSliderChange('shieldCooldown', v)}
                      onReset={() => handleResetSetting('shieldCooldown')}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'Enemy Controls' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-8">
                  <SectionHeader title="Core Stats" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Enemy HP"
                      value={settings.enemyHp}
                      min={10} max={500} step={5}
                      onChange={(v) => handleSliderChange('enemyHp', v)}
                      onReset={() => handleResetSetting('enemyHp')}
                    />
                    <SettingControl
                      label="Enemy Size"
                      value={settings.enemySize}
                      min={0.5} max={5.0} step={0.1} unit=" Tiles"
                      onChange={(v) => handleSliderChange('enemySize', v)}
                      onReset={() => handleResetSetting('enemySize')}
                    />
                    <SettingControl
                      label="Base Speed"
                      value={settings.enemyBaseSpeed}
                      min={0.5} max={12.0} step={0.1}
                      onChange={(v) => handleSliderChange('enemyBaseSpeed', v)}
                      onReset={() => handleResetSetting('enemyBaseSpeed')}
                    />
                    <SettingControl
                      label="Max Speed"
                      value={settings.enemyMaxSpeed}
                      min={1.0} max={25.0} step={0.5}
                      onChange={(v) => handleSliderChange('enemyMaxSpeed', v)}
                      onReset={() => handleResetSetting('enemyMaxSpeed')}
                    />
                    <SettingControl
                      label="Base Spin"
                      value={settings.enemyBaseRotation}
                      min={0.5} max={25.0} step={0.1}
                      onChange={(v) => handleSliderChange('enemyBaseRotation', v)}
                      onReset={() => handleResetSetting('enemyBaseRotation')}
                    />
                    <SettingControl
                      label="Max Spin"
                      value={settings.enemyMaxRotation}
                      min={1.0} max={60.0} step={0.5}
                      onChange={(v) => handleSliderChange('enemyMaxRotation', v)}
                      onReset={() => handleResetSetting('enemyMaxRotation')}
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <SectionHeader title="AI Intelligence" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Hunt Radius"
                      value={settings.huntRadiusMultiplier}
                      min={1} max={10} step={0.5} unit="x"
                      onChange={(v) => handleSliderChange('huntRadiusMultiplier', v)}
                      onReset={() => handleResetSetting('huntRadiusMultiplier')}
                    />
                    <SettingControl
                      label="Evade Radius"
                      value={settings.evadeRadiusMultiplier}
                      min={0} max={10} step={0.5} unit="x"
                      onChange={(v) => handleSliderChange('evadeRadiusMultiplier', v)}
                      onReset={() => handleResetSetting('evadeRadiusMultiplier')}
                    />
                    <SettingControl
                      label="Decision Interval"
                      value={settings.decisionInterval}
                      min={0.05} max={1.0} step={0.05} unit="s"
                      onChange={(v) => handleSliderChange('decisionInterval', v)}
                      onReset={() => handleResetSetting('decisionInterval')}
                    />
                    <SettingControl
                      label="Prediction Accuracy"
                      value={settings.predictionAccuracy}
                      min={0} max={100} step={5} unit="%"
                      onChange={(v) => handleSliderChange('predictionAccuracy', v)}
                      onReset={() => handleResetSetting('predictionAccuracy')}
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <SectionHeader title="AI Tuning" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Aggression Bias"
                      value={settings.aggressionBias}
                      min={0} max={100} step={5}
                      onChange={(v) => handleSliderChange('aggressionBias', v)}
                      onReset={() => handleResetSetting('aggressionBias')}
                    />
                    <SettingControl
                      label="Reaction Delay"
                      value={settings.reactionDelay}
                      min={0} max={500} step={10} unit="ms"
                      onChange={(v) => handleSliderChange('reactionDelay', v)}
                      onReset={() => handleResetSetting('reactionDelay')}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'Combat Controls' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-8">
                  <SectionHeader title="Combat Engine & Models" />
                  <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700">
                    <label className="block text-sm font-bold text-neutral-400 mb-4 uppercase tracking-widest">Select Model</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['simple', 'layered', 'experimental', 'hardcore'].map(model => (
                        <button 
                          key={model}
                          onClick={() => handleSelectChange('combatModel', model)}
                          className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-1 ${settings.combatModel === model ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-neutral-600'}`}
                        >
                          <span className="font-bold capitalize">{model} Model</span>
                          <span className="text-[10px] opacity-70">
                            {model === 'simple' && 'Raw velocity wins.'}
                            {model === 'layered' && 'Angles, spin, stability.'}
                            {model === 'experimental' && 'High variance, chaotic.'}
                            {model === 'hardcore' && 'Punishing, high-stakes.'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <SectionHeader title="Combat Weights" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Momentum Weight"
                      value={settings.weightMomentum}
                      min={0} max={5} step={0.1}
                      onChange={(v) => handleSliderChange('weightMomentum', v)}
                      onReset={() => handleResetSetting('weightMomentum')}
                    />
                    <SettingControl
                      label="Rotation Weight"
                      value={settings.weightRotation}
                      min={0} max={5} step={0.1}
                      onChange={(v) => handleSliderChange('weightRotation', v)}
                      onReset={() => handleResetSetting('weightRotation')}
                    />
                    <SettingControl
                      label="Stability Weight"
                      value={settings.weightStability}
                      min={0} max={5} step={0.1}
                      onChange={(v) => handleSliderChange('weightStability', v)}
                      onReset={() => handleResetSetting('weightStability')}
                    />
                    <SettingControl
                      label="HP Ratio Weight"
                      value={settings.weightHp}
                      min={0} max={5} step={0.1}
                      onChange={(v) => handleSliderChange('weightHp', v)}
                      onReset={() => handleResetSetting('weightHp')}
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <SectionHeader title="Damage & Scaling" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SettingControl
                      label="Stability Absorption"
                      value={settings.stabilityAbsorption}
                      min={0} max={1.0} step={0.05} unit="x"
                      onChange={(v) => handleSliderChange('stabilityAbsorption', v)}
                      onReset={() => handleResetSetting('stabilityAbsorption')}
                    />
                    <SettingControl
                      label="Clash Damage Ratio"
                      value={settings.clashDamageRatio}
                      min={0.1} max={1.0} step={0.05} unit="x"
                      onChange={(v) => handleSliderChange('clashDamageRatio', v)}
                      onReset={() => handleResetSetting('clashDamageRatio')}
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <SectionHeader title="Visual Feedback" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ToggleControl
                      label="Enable Screen Shake"
                      active={settings.screenShakeEnabled}
                      onToggle={() => handleToggleChange('screenShakeEnabled')}
                    />
                    <SettingControl
                      label="Shake Intensity"
                      value={settings.screenShakeIntensity}
                      min={0} max={5.0} step={0.1} unit="x"
                      onChange={(v) => handleSliderChange('screenShakeIntensity', v)}
                      onReset={() => handleResetSetting('screenShakeIntensity')}
                    />
                    <SettingControl
                      label="Screen Stabilizer"
                      value={settings.screenStabilization}
                      min={0} max={100} step={5} unit="%"
                      onChange={(v) => handleSliderChange('screenStabilization', v)}
                      onReset={() => handleResetSetting('screenStabilization')}
                      description="Reduces camera shake intensity. 100% = perfectly stable."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'Reference' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
                <SectionHeader title="Combat Styles Guide" />
                <div className="grid grid-cols-1 gap-4">
                  <GuideSection 
                    title="1. Physics Momentum" 
                    description="Forward velocity and impact angle determine the attacker. Head-on hits deal bonus damage." 
                  />
                  <GuideSection 
                    title="2. Spin-Power Scaling" 
                    description="Rotation speed acts as a damage multiplier. Higher spin = stronger hits." 
                  />
                  <GuideSection 
                    title="3. Stability Shield" 
                    description="Secondary health layer absorbs damage. HP is hit once stability is low." 
                  />
                  <GuideSection 
                    title="4. Intent Engagement" 
                    description="Attacking intent grants a score bonus. Parity triggers a Clash." 
                  />
                </div>
              </div>
            )}

            {activeCategory === 'Momentum' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <SectionHeader title="Momentum Engine" />
                <ToggleControl
                  label="Enable Momentum System"
                  active={settings.momentumEnabled}
                  onToggle={() => handleToggleChange('momentumEnabled')}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <SettingControl
                    label="Spin Gain Delay"
                    value={settings.spinGainDelay}
                    min={0} max={10} step={0.5} unit="s"
                    onChange={(v) => handleSliderChange('spinGainDelay', v)}
                    onReset={() => handleResetSetting('spinGainDelay')}
                    description="Wait time after being hit before spin starts recovering."
                  />
                  <SettingControl
                    label="Move Gain Delay"
                    value={settings.movementGainDelay}
                    min={0} max={10} step={0.5} unit="s"
                    onChange={(v) => handleSliderChange('movementGainDelay', v)}
                    onReset={() => handleResetSetting('movementGainDelay')}
                    description="Wait time after being hit before speed starts recovering."
                  />
                </div>
                <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700">
                  <label className="block text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">Scaling Curve</label>
                  <p className="text-xs text-neutral-500 mb-4 italic">Defines how stats like speed and rotation grow over time or with boosts.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {['linear', 'exponential', 'flat'].map(curve => (
                      <button
                        key={curve}
                        onClick={() => handleSelectChange('momentumScalingCurve', curve)}
                        className={`py-3 rounded-xl border transition-all capitalize font-medium ${
                          settings.momentumScalingCurve === curve 
                            ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/20' 
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                        }`}
                      >
                        {curve}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <div className="text-[10px] text-neutral-500"><span className="text-cyan-400 font-bold">LINEAR:</span> Constant growth rate. Balanced and fair.</div>
                    <div className="text-[10px] text-neutral-500"><span className="text-cyan-400 font-bold">EXPONENTIAL:</span> Growth accelerates as stats increase. High risk, high reward.</div>
                    <div className="text-[10px] text-neutral-500"><span className="text-cyan-400 font-bold">FLAT:</span> Minimal growth. Emphasizes tactical positioning over raw power accumulation.</div>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'Combat Styles' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <SectionHeader title="Select Combat Styles" />
                <p className="text-neutral-400 text-sm -mt-4 mb-4">Toggle the core tactical pillars of the game. Disabling a style removes its unique logic from the engine.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ToggleControl
                    label="1. Physics Momentum"
                    active={settings.enablePhysicsMomentum}
                    onToggle={() => handleToggleChange('enablePhysicsMomentum')}
                  />
                  <ToggleControl
                    label="2. Spin-Power Scaling"
                    active={settings.enableSpinPowerScaling}
                    onToggle={() => handleToggleChange('enableSpinPowerScaling')}
                  />
                  <ToggleControl
                    label="3. Stability Shield"
                    active={settings.enableStabilityShield}
                    onToggle={() => handleToggleChange('enableStabilityShield')}
                  />
                  <ToggleControl
                    label="4. Intent Engagement"
                    active={settings.enableIntentEngagement}
                    onToggle={() => handleToggleChange('enableIntentEngagement')}
                  />
                  <ToggleControl
                    label="5. Arena Control"
                    active={settings.enableArenaControl}
                    onToggle={() => handleToggleChange('enableArenaControl')}
                  />
                  <ToggleControl
                    label="6. Tactical AI"
                    active={settings.enableTacticalAI}
                    onToggle={() => handleToggleChange('enableTacticalAI')}
                  />
                </div>
              </div>
            )}
            
            {activeCategory === 'Combat Model' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <SectionHeader title="Combat Engine" />
                <p className="text-neutral-400 text-sm -mt-4 mb-4">Choose the underlying physics engine for combat resolution.</p>
                <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700">
                  <label className="block text-sm font-bold text-neutral-400 mb-4 uppercase tracking-widest">Combat Model</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleSelectChange('combatModel', 'simple')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-1 ${settings.combatModel === 'simple' ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-neutral-600'}`}
                    >
                      <span className="font-bold">Simple Model</span>
                      <span className="text-[10px] opacity-70">Higher velocity wins, flat damage based on speed.</span>
                    </button>
                    <button 
                      onClick={() => handleSelectChange('combatModel', 'layered')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-1 ${settings.combatModel === 'layered' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-neutral-600'}`}
                    >
                      <span className="font-bold">Layered Model</span>
                      <span className="text-[10px] opacity-70">Complex calculation involving impact angle, rotation differences, and stability absorption.</span>
                    </button>
                  </div>
                </div>

                {settings.combatModel === 'layered' && (
                  <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                    <SettingControl
                      label="Max Stability"
                      value={settings.maxStability}
                      min={10} max={200} step={10}
                      onChange={(v) => handleSliderChange('maxStability', v)}
                      onReset={() => handleResetSetting('maxStability')}
                      description="Stability absorbs 70% of incoming damage before HP is affected."
                    />
                    <SettingControl
                      label="Stability Regen / Sec"
                      value={settings.stabilityRegenPerSecond}
                      min={1} max={50} step={1}
                      onChange={(v) => handleSliderChange('stabilityRegenPerSecond', v)}
                      onReset={() => handleResetSetting('stabilityRegenPerSecond')}
                      description="How fast stability recovers after 2 seconds of safety."
                    />
                    <SettingControl
                      label="AI Combat Threshold"
                      value={settings.aiCombatThreshold}
                      min={-50} max={50} step={1}
                      onChange={(v) => handleSliderChange('aiCombatThreshold', v)}
                      onReset={() => handleResetSetting('aiCombatThreshold')}
                      description="Higher values make the AI more cautious; lower values make it more aggressive."
                    />
                  </div>
                )}
              </div>
            )}

            {activeCategory === 'Visual Debug' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <SectionHeader title="Diagnostic Overlays" />
                <ToggleControl
                  label="Show Radii"
                  active={settings.showRadii}
                  onToggle={() => handleToggleChange('showRadii')}
                />
                <ToggleControl
                  label="Show Velocity Vectors"
                  active={settings.showVelocityVectors}
                  onToggle={() => handleToggleChange('showVelocityVectors')}
                />
                <ToggleControl
                  label="Show Momentum Meters"
                  active={settings.showMomentumMeters}
                  onToggle={() => handleToggleChange('showMomentumMeters')}
                />
                <ToggleControl
                  label="Show Collision Impact Force"
                  active={settings.showCollisionImpactNumbers}
                  onToggle={() => handleToggleChange('showCollisionImpactNumbers')}
                />
                <ToggleControl
                  label="Show Vibration Monitor"
                  active={settings.showVibrationMonitor}
                  onToggle={() => handleToggleChange('showVibrationMonitor')}
                />
                <div className="pt-6 border-t border-neutral-800 space-y-6">
                  <SectionHeader title="HUD Interface" />
                  <SettingControl
                    label="Default HUD Opacity"
                    value={settings.hudOpacity}
                    min={0} max={100} step={5} unit="%"
                    onChange={(v) => handleSliderChange('hudOpacity', v)}
                    onReset={() => handleResetSetting('hudOpacity')}
                    description="Base transparency for the status overlays."
                  />
                  <ToggleControl
                    label="Auto-Hide on Occlusion"
                    active={settings.autoHideHud}
                    onToggle={() => handleToggleChange('autoHideHud')}
                  />
                </div>
              </div>
            )}

            {activeCategory === 'System Checklist' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <SectionHeader title="System Integrity Checklist" />
                <div className="grid grid-cols-1 gap-4">
                  <ChecklistItem 
                    title="1. Physics Momentum Combat" 
                    description="Forward velocity and impact angle determine the attacker. Head-on hits deal 200% damage." 
                    checked={settings.enablePhysicsMomentum}
                  />
                  <ChecklistItem 
                    title="2. Spin-Power Scaling" 
                    description="Rotation speed acts as a damage multiplier. Higher spin = stronger hits and better defense." 
                    checked={settings.enableSpinPowerScaling}
                  />
                  <ChecklistItem 
                    title="3. Stability Shield System" 
                    description="Secondary health layer absorbs 70% of damage. HP is only hit once stability is low." 
                    checked={settings.enableStabilityShield}
                  />
                  <ChecklistItem 
                    title="4. Intent-Based Engagement" 
                    description="Attacking intent grants a +5% score bonus. Scores within 5% parity trigger a Clash." 
                    checked={settings.enableIntentEngagement}
                  />
                  <ChecklistItem 
                    title="5. Arena Control Combat" 
                    description="Utilize boost tiles and environmental gravity to manipulate the battlefield and trap enemies." 
                    checked={settings.enableArenaControl}
                  />
                  <ChecklistItem 
                    title="6. Tactical AI State-Machine" 
                    description="Enemies use a state-machine (Hunt/Evade/Idle) to evaluate combat risk and commit to windows." 
                    checked={settings.enableTacticalAI}
                  />
                </div>
              </div>
            )}

            {activeCategory === 'Specials List' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <SectionHeader title="Special Abilities Reference" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SpecialInfoCard 
                    name="Bounce Shield" 
                    type="Defensive"
                    description="Prevents damage and momentum loss. Converts 50% damage to stability."
                  />
                  <SpecialInfoCard 
                    name="Gravity Pull" 
                    type="Control"
                    description="Drags enemy toward you. Perfect for setting up high-speed collisions."
                  />
                  <SpecialInfoCard 
                    name="Size Shift" 
                    type="Offensive"
                    description="Increases physical size by 40% and damage output by 35%."
                  />
                  <SpecialInfoCard 
                    name="Cloak Pulse" 
                    type="Stealth"
                    description="Become invisible and untargetable. Cannot attack while active."
                  />
                  <SpecialInfoCard 
                    name="Armor Break" 
                    type="Offensive"
                    description="Ignores 40% of enemy stability absorption on hit."
                  />
                  <SpecialInfoCard 
                    name="Counter Core" 
                    type="Reactive"
                    description="Reflects 30% of incoming damage back to the attacker."
                  />
                  <SpecialInfoCard 
                    name="Shockwave" 
                    type="Control"
                    description="Pushes enemies away strongly on collision (+3 tiles)."
                  />
                  <SpecialInfoCard 
                    name="Momentum Lock" 
                    type="Utility"
                    description="Prevents movement speed loss on the next hit. Consumed on impact."
                  />
                  <SpecialInfoCard 
                    name="Berserk Rage" 
                    type="Offensive"
                    description="Damage increases as HP decreases. Up to +50% bonus at low health."
                  />
                  <SpecialInfoCard 
                    name="Mirror Shield" 
                    type="Defensive"
                    description="Reflects 50% of incoming damage back to the attacker for 4s."
                  />
                  <SpecialInfoCard 
                    name="Blink" 
                    type="Movement"
                    description="Instantly teleport behind the opponent. High tactical advantage."
                  />
                </div>
              </div>
            )}

            {activeCategory === 'Developer Docs' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
                <SectionHeader title="Game Development & Systems Architecture" />
                
                <div className="space-y-10">
                  <div className="bg-neutral-800/20 p-6 rounded-3xl border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                      <span className="w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center justify-center text-sm">01</span>
                      Physics & Collision Engine
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GuideSection 
                        title="Vector-Based Movement" 
                        description="Tops move using 2D velocity vectors (vx, vy). Position is updated every frame: x += vx * dt. Friction is applied as speed *= friction_coefficient."
                      />
                      <GuideSection 
                        title="Elastic Collisions" 
                        description="Collisions use the Law of Conservation of Momentum. Impact force is calculated based on relative velocity and reflected across the normal vector of collision."
                      />
                      <GuideSection 
                        title="Clipping Prevention" 
                        description="A 'Stuck Detection' system monitors coordinates. If a top remains immobile or clips through borders, a nudge force or emergency respawn is triggered."
                      />
                      <GuideSection 
                        title="Momentum Transfer" 
                        description="Collisions transfer a portion of the attacker's velocity to the defender, modified by the 'Momentum Transfer Multiplier' setting."
                      />
                    </div>
                  </div>

                  <div className="bg-neutral-800/20 p-6 rounded-3xl border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                      <span className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center text-sm">02</span>
                      Combat & Damage Systems
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GuideSection 
                        title="Engagement Scoring" 
                        description="Every collision calculates an 'Attack Score' for both tops. Score = (Velocity · DirectionToEnemy) * SpinFactor * IntentBonus."
                      />
                      <GuideSection 
                        title="Damage Calculation" 
                        description="Damage = BaseDamage * ImpactEfficiency * GravityModifier. BaseDamage scales with rotation speed if 'Spin-Power Scaling' is enabled."
                      />
                      <GuideSection 
                        title="Stability Layer" 
                        description="Stability acts as a buffer. Damage is split: 70% to Stability, 30% to HP. If Stability is 0, 100% damage goes to HP."
                      />
                      <GuideSection 
                        title="Clash Mechanics" 
                        description="If the difference between Attack Scores is < 5%, a 'Clash' is triggered. Both tops take 50% damage and experience 120% bounce force."
                      />
                    </div>
                  </div>

                  <div className="bg-neutral-800/20 p-6 rounded-3xl border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                      <span className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center text-sm">03</span>
                      AI State-Machine Architecture
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GuideSection 
                        title="State Evaluation" 
                        description="AI cycles through 'Hunt', 'Evade', and 'Idle' states every 100ms. Decision is based on HP ratio, stability, and relative momentum."
                      />
                      <GuideSection 
                        title="Target Prediction" 
                        description="Advanced AI calculates the player's future position based on current velocity and applies a lead-pursuit algorithm for interceptions."
                      />
                      <GuideSection 
                        title="Risk Assessment" 
                        description="The AI compares its potential damage output vs. incoming risk. If risk > tolerance, it switches to 'Evade' mode to regenerate stability."
                      />
                      <GuideSection 
                        title="Special Usage Logic" 
                        description="Specials are triggered reactively (e.g., Shield when HP < 30%) or offensively (e.g., Gravity Pull when in Hunt range)."
                      />
                    </div>
                  </div>

                  <div className="bg-neutral-800/20 p-6 rounded-3xl border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                      <span className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center text-sm">04</span>
                      Modular Special Abilities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GuideSection 
                        title="Active Specials" 
                        description="Triggered by keys or AI logic. They apply temporary modifiers to TopState (e.g., speedBoostTimer, shieldTimer)."
                      />
                      <GuideSection 
                        title="Passive Specials" 
                        description="Constant modifiers applied during the game loop. Examples include 'Stability Regen' and 'Spin Weight' bonuses."
                      />
                      <GuideSection 
                        title="Cooldown Management" 
                        description="A centralized timer system prevents ability spam. Cooldowns are tracked in the TopState.specialCooldowns array."
                      />
                      <GuideSection 
                        title="Visual Feedback" 
                        description="Each special triggers unique particle effects (Sparks) and UI indicators (Auras) to communicate state changes to the player."
                      />
                    </div>
                  </div>

                  <div className="bg-neutral-800/20 p-6 rounded-3xl border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                      <span className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center text-sm">05</span>
                      Challenges & Circumventions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GuideSection 
                        title="Physics Tunneling" 
                        description="High-speed collisions caused tops to clip through arena borders. Circumvented by a 'Stuck Detection' system that monitors coordinates and applies a corrective 'Nudge' or emergency respawn if bounds are breached."
                      />
                      <GuideSection 
                        title="Screen Shake Lag" 
                        description="Initial camera shake felt 'mushy' due to CSS transitions fighting the transform. Circumvented by removing 'transition-transform' from the container, allowing for frame-perfect, crisp coordinate offsets."
                      />
                      <GuideSection 
                        title="AI Oscillation" 
                        description="AI would rapidly flicker between Hunt and Evade states at HP thresholds. Circumvented by implementing state-machine hysteresis and a 100ms evaluation heartbeat to stabilize decision-making."
                      />
                      <GuideSection 
                        title="Momentum Bleed" 
                        description="Inelastic collisions were losing too much energy. Circumvented by refining the momentum transfer multiplier and adding a 'Spin-Power' buffer that converts rotational energy into linear velocity during impacts."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex justify-center gap-4">
          <button 
            onClick={handleResetAll}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-bold py-4 px-8 rounded-2xl transition-all flex items-center gap-3 border border-neutral-700"
          >
            <RotateCcw size={20} /> Reset Defaults
          </button>
          <button 
            onClick={handleSave}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-4 px-16 rounded-2xl transition-all shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] text-lg flex items-center gap-3"
          >
            <Save size={20} /> Apply Configuration
          </button>
        </div>
      </div>

      {/* Preset Menu Overlay */}
      {showPresetMenu && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Preset Manager</h2>
              <button onClick={() => setShowPresetMenu(false)} className="text-neutral-500 hover:text-white text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="New preset name..."
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <button 
                  onClick={handleSavePreset}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-xl font-bold transition-colors"
                >
                  Save
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Recommended</p>
                {RECOMMENDED_PRESETS.map(p => (
                  <div key={p.name} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-xl border border-neutral-700/50 group">
                    <span className="font-medium text-neutral-200">{p.name}</span>
                    <button 
                      onClick={() => handleLoadPreset(p)}
                      className="text-cyan-400 hover:text-cyan-300 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Load
                    </button>
                  </div>
                ))}

                {customPresets.length > 0 && (
                  <>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-6 mb-2">Custom</p>
                    {customPresets.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-xl border border-neutral-700/50 group">
                        <span className="font-medium text-neutral-200">{p.name}</span>
                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleLoadPreset(p)} className="text-cyan-400 hover:text-cyan-300 text-sm font-bold">Load</button>
                          <button onClick={() => handleDeletePreset(i)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-cyan-500 pl-4 uppercase tracking-wider">{title}</h2>
);

const ChecklistItem: React.FC<{ title: string, description: string, checked: boolean }> = ({ title, description, checked }) => (
  <div className="flex items-start gap-4 p-4 bg-neutral-800/40 rounded-2xl border border-neutral-800">
    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center ${checked ? 'bg-emerald-500 text-white' : 'bg-neutral-700 text-neutral-500'}`}>
      {checked ? '✓' : ''}
    </div>
    <div>
      <h3 className="font-bold text-white uppercase tracking-wide text-sm">{title}</h3>
      <p className="text-neutral-400 text-xs mt-1">{description}</p>
    </div>
  </div>
);

const SpecialInfoCard: React.FC<{ name: string, type: string, description: string }> = ({ name, type, description }) => (
  <div className="p-4 bg-neutral-800/40 rounded-2xl border border-neutral-800 hover:border-cyan-500/30 transition-colors group">
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-bold text-white uppercase tracking-wider">{name}</h3>
      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
        type === 'Offensive' ? 'bg-red-500/20 text-red-400' :
        type === 'Defensive' ? 'bg-blue-500/20 text-blue-400' :
        type === 'Control' ? 'bg-purple-500/20 text-purple-400' :
        'bg-amber-500/20 text-amber-400'
      }`}>{type}</span>
    </div>
    <p className="text-neutral-400 text-xs leading-relaxed">{description}</p>
  </div>
);

const GuideSection: React.FC<{ title: string, description: string }> = ({ title, description }) => (
  <div className="bg-neutral-800/40 p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-colors">
    <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-widest mb-2">{title}</h3>
    <p className="text-neutral-400 text-sm leading-relaxed">{description}</p>
  </div>
);

interface SettingControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onReset: () => void;
  description?: string;
  unit?: string;
}

const SettingControl: React.FC<SettingControlProps> = ({ label, value, min, max, step, onChange, onReset, description, unit }) => (
  <div className="group">
    <div className="flex justify-between items-end mb-3">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-1">{label}</span>
        {description && <p className="text-xs text-neutral-600 max-w-xs">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={onReset}
          className="p-1.5 text-neutral-600 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Reset to Default"
        >
          <RotateCcw size={14} />
        </button>
        <span className="text-xl font-black text-cyan-400 font-mono">{value}{unit}</span>
      </div>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
    />
  </div>
);

const ToggleControl: React.FC<{ label: string; active: boolean; onToggle: () => void }> = ({ label, active, onToggle }) => (
  <button 
    onClick={onToggle}
    className="w-full flex items-center justify-between p-4 bg-neutral-800/50 rounded-2xl border border-neutral-700 hover:bg-neutral-800 transition-all group"
  >
    <span className="font-bold text-neutral-300 uppercase tracking-widest text-sm">{label}</span>
    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${active ? 'bg-cyan-500' : 'bg-neutral-700'}`}>
      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
    </div>
  </button>
);

export default Settings;
