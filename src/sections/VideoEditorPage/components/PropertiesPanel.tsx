
import React, { useState } from 'react';
import { Clip, MediaType } from '../../VideoEditorPage/types'; 
import { 
  RotateCw, RefreshCcw, Monitor, Sliders, 
  Type, Music, Zap, Gauge, AlignCenter, AlignLeft, AlignRight
} from 'lucide-react';
import "../style.css";

interface PropertiesPanelProps {
  selectedClip: Clip | undefined;
  onUpdate: (id: string, updates: Partial<Clip>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedClip, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('Video');
  const [subTab, setSubTab] = useState('Basic');

  if (!selectedClip) {
    return (
      <div className="w-full h-full bg-transparent flex flex-col items-center justify-center text-zinc-500 select-none">
        <div className="w-20 h-20 rounded-2xl bg-white/5 mb-6 flex items-center justify-center border border-white/5 shadow-inner inset-3d">
          <Monitor size={32} className="text-zinc-600" />
        </div>
        <p className="text-xs font-bold tracking-widest uppercase text-zinc-600">No Selection</p>
      </div>
    );
  }

  const handlePropChange = (key: keyof typeof selectedClip.properties, value: any) => {
    onUpdate(selectedClip.id, {
      properties: { ...selectedClip.properties, [key]: value }
    });
  };

  const TABS = [
    { id: 'Video', icon: Monitor, visible: selectedClip.type === MediaType.VIDEO || selectedClip.type === MediaType.IMAGE },
    { id: 'Audio', icon: Music, visible: true },
    { id: 'Text', icon: Type, visible: selectedClip.type === MediaType.TEXT },
    { id: 'Speed', icon: Gauge, visible: selectedClip.type === MediaType.VIDEO || selectedClip.type === MediaType.AUDIO },
    { id: 'Animation', icon: Zap, visible: true },
    { id: 'Adjust', icon: Sliders, visible: selectedClip.type === MediaType.VIDEO || selectedClip.type === MediaType.IMAGE },
  ];

  const FONTS = [
    "Arial", "Verdana", "Georgia", "Times New Roman", "Courier New", "Impact", "Comic Sans MS", "Trebuchet MS"
  ];

  return (
    <div className="w-full h-full bg-transparent flex flex-col text-zinc-200 select-none font-sans">
      {/* Tabs */}
      <div className="flex items-center px-4 pt-5 pb-0 border-b border-white/5 space-x-6 overflow-x-auto no-scrollbar">
        {TABS.filter(t => t.visible).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-[10px] font-bold uppercase tracking-wider transition-all relative ${
              activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.id}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white rounded-t-full shadow-[0_0_15px_rgba(255,255,255,0.8)]" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-8">
        
        {/* --- VIDEO TAB --- */}
        {activeTab === 'Video' && (
          <>
            <div className="flex bg-black/40 rounded-xl p-1 mb-6 border border-white/5 shadow-inner">
               {['Basic', 'Cutout', 'Mask', 'Enhance'].map(t => (
                 <button key={t} onClick={() => setSubTab(t)} className={`flex-1 text-[10px] py-2 rounded-lg transition-all font-bold ${subTab === t ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>{t}</button>
               ))}
            </div>
            {subTab === 'Basic' && (
              <div className="space-y-6">
                {/* Scale */}
                <div className="space-y-3">
                   <div className="flex justify-between"><label className="text-xs text-zinc-400 font-bold">Scale</label><span className="text-xs text-white font-mono bg-white/10 px-1.5 rounded">{Math.round(selectedClip.properties.scale * 100)}%</span></div>
                   <input type="range" min="0.1" max="3" step="0.1" value={selectedClip.properties.scale} onChange={(e) => handlePropChange('scale', parseFloat(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full accent-white appearance-none cursor-pointer border border-white/5" />
                </div>
                {/* Position */}
                <div className="space-y-3">
                   <label className="text-xs text-zinc-400 font-bold">Position</label>
                   <div className="flex gap-3">
                     <div className="flex-1 inset-3d flex items-center px-3 py-2">
                        <span className="text-[10px] text-zinc-500 font-bold mr-2">X</span>
                        <input type="number" value={Math.round(selectedClip.properties.x)} onChange={(e) => handlePropChange('x', parseFloat(e.target.value))} className="w-full bg-transparent text-xs text-right text-white outline-none font-mono" />
                     </div>
                     <div className="flex-1 inset-3d flex items-center px-3 py-2">
                        <span className="text-[10px] text-zinc-500 font-bold mr-2">Y</span>
                        <input type="number" value={Math.round(selectedClip.properties.y)} onChange={(e) => handlePropChange('y', parseFloat(e.target.value))} className="w-full bg-transparent text-xs text-right text-white outline-none font-mono" />
                     </div>
                   </div>
                </div>
                {/* Rotation */}
                <div className="space-y-3">
                   <div className="flex justify-between"><label className="text-xs text-zinc-400 font-bold">Rotate</label><span className="text-xs text-white font-mono bg-white/10 px-1.5 rounded">{Math.round(selectedClip.properties.rotation)}°</span></div>
                   <input type="range" min="-180" max="180" value={selectedClip.properties.rotation} onChange={(e) => handlePropChange('rotation', parseFloat(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full accent-white appearance-none cursor-pointer border border-white/5" />
                </div>
                {/* Opacity */}
                <div className="space-y-3">
                   <div className="flex justify-between"><label className="text-xs text-zinc-400 font-bold">Opacity</label><span className="text-xs text-white font-mono bg-white/10 px-1.5 rounded">{Math.round(selectedClip.properties.opacity * 100)}%</span></div>
                   <input type="range" min="0" max="1" step="0.01" value={selectedClip.properties.opacity} onChange={(e) => handlePropChange('opacity', parseFloat(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full accent-white appearance-none cursor-pointer border border-white/5" />
                </div>
                 {/* Blend */}
                 <div className="space-y-3">
                   <label className="text-xs text-zinc-400 font-bold">Blend Mode</label>
                   <div className="inset-3d px-2">
                       <select value={selectedClip.properties.blendMode || 'normal'} onChange={(e) => handlePropChange('blendMode', e.target.value)} className="w-full bg-transparent text-xs p-2 outline-none text-zinc-200 cursor-pointer">
                          <option value="source-over" className="bg-zinc-900">Normal</option>
                          <option value="overlay" className="bg-zinc-900">Overlay</option>
                          <option value="multiply" className="bg-zinc-900">Multiply</option>
                          <option value="screen" className="bg-zinc-900">Screen</option>
                          <option value="lighten" className="bg-zinc-900">Lighten</option>
                          <option value="darken" className="bg-zinc-900">Darken</option>
                       </select>
                   </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- TEXT TAB --- */}
        {activeTab === 'Text' && (
           <div className="space-y-6">
              <div className="space-y-3">
                  <label className="text-xs text-zinc-400 font-bold">Content</label>
                  <textarea 
                     className="w-full inset-3d p-3 text-xs text-white outline-none resize-none h-24 placeholder-zinc-600"
                     value={selectedClip.name}
                     onChange={(e) => onUpdate(selectedClip.id, { name: e.target.value })}
                     placeholder="Enter text..."
                  />
              </div>
              <div className="space-y-3">
                  <label className="text-xs text-zinc-400 font-bold">Font Family</label>
                  <div className="inset-3d px-2">
                      <select 
                        value={selectedClip.properties.fontFamily || 'Arial'} 
                        onChange={(e) => handlePropChange('fontFamily', e.target.value)} 
                        className="w-full bg-transparent text-xs p-2 outline-none text-zinc-200 cursor-pointer"
                      >
                          {FONTS.map(font => (
                              <option key={font} value={font} style={{ fontFamily: font }} className="bg-zinc-900">{font}</option>
                          ))}
                      </select>
                  </div>
              </div>
              <div className="space-y-3">
                  <label className="text-xs text-zinc-400 font-bold">Font Size</label>
                  <div className="flex gap-3 items-center">
                     <input type="range" min="10" max="300" value={selectedClip.properties.fontSize || 120} onChange={(e) => handlePropChange('fontSize', parseFloat(e.target.value))} className="flex-1 h-1.5 bg-black/50 rounded-full accent-white appearance-none cursor-pointer border border-white/5" />
                     <span className="text-xs w-10 text-right text-white font-mono bg-white/10 px-1 rounded">{selectedClip.properties.fontSize || 120}</span>
                  </div>
              </div>
              <div className="space-y-3">
                  <label className="text-xs text-zinc-400 font-bold">Color</label>
                  <div className="flex items-center gap-3 inset-3d p-2">
                     <div className="w-8 h-8 rounded-lg border border-white/20 overflow-hidden relative shadow-sm">
                        <input type="color" value={selectedClip.properties.textColor || '#ffffff'} onChange={(e) => handlePropChange('textColor', e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0" />
                     </div>
                     <span className="text-xs uppercase flex-1 text-zinc-300 font-mono tracking-wider">{selectedClip.properties.textColor || '#ffffff'}</span>
                  </div>
              </div>
           </div>
        )}

        {/* --- ADJUST TAB --- */}
        {activeTab === 'Adjust' && (
            <div className="space-y-6">
               {['brightness', 'contrast', 'saturation'].map(filter => (
                   <div key={filter} className="space-y-2">
                       <div className="flex justify-between text-xs capitalize text-zinc-400 font-bold">
                           <span>{filter}</span>
                           <span className="text-xs text-white font-mono bg-white/10 px-1.5 rounded">{Math.round(((selectedClip.properties as any)[filter] - 1) * 100)}</span>
                       </div>
                       <input type="range" min="0" max="2" step="0.05" value={(selectedClip.properties as any)[filter]} onChange={(e) => handlePropChange(filter as any, parseFloat(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full accent-white appearance-none cursor-pointer border border-white/5" />
                   </div>
               ))}
               <div className="space-y-2">
                   <div className="flex justify-between text-xs capitalize text-zinc-400 font-bold"><span>Blur</span><span className="text-xs text-white font-mono bg-white/10 px-1.5 rounded">{selectedClip.properties.blur || 0}px</span></div>
                   <input type="range" min="0" max="20" step="0.5" value={selectedClip.properties.blur || 0} onChange={(e) => handlePropChange('blur', parseFloat(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full accent-white appearance-none cursor-pointer border border-white/5" />
               </div>
               <div className="space-y-2">
                   <div className="flex justify-between text-xs capitalize text-zinc-400 font-bold"><span>Hue</span><span className="text-xs text-white font-mono bg-white/10 px-1.5 rounded">{selectedClip.properties.hue || 0}°</span></div>
                   <div className="relative h-2 rounded-full overflow-hidden ring-1 ring-white/10">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 opacity-80" />
                      <input type="range" min="-180" max="180" value={selectedClip.properties.hue || 0} onChange={(e) => handlePropChange('hue', parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                   </div>
               </div>
            </div>
        )}
        
        {/* --- AUDIO TAB --- */}
        {activeTab === 'Audio' && (
           <div className="space-y-6">
              <div className="space-y-3">
                  <div className="flex justify-between"><label className="text-xs text-zinc-400 font-bold">Volume</label><span className="text-xs text-white font-mono bg-white/10 px-1.5 rounded">{Math.round(selectedClip.properties.volume * 100)}%</span></div>
                  <input type="range" min="0" max="2" step="0.1" value={selectedClip.properties.volume} onChange={(e) => handlePropChange('volume', parseFloat(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full accent-white appearance-none cursor-pointer border border-white/5" />
              </div>
              <div className="space-y-3">
                  <label className="text-xs text-zinc-400 font-bold">Fade In/Out (sec)</label>
                  <div className="flex gap-3">
                      <div className="flex-1 inset-3d flex items-center px-3 py-2">
                          <span className="text-[10px] text-zinc-500 font-bold mr-2">IN</span>
                          <input type="number" min="0" step="0.1" value={selectedClip.properties.fadeIn || 0} onChange={(e) => handlePropChange('fadeIn', parseFloat(e.target.value))} className="w-full bg-transparent text-xs text-center text-white outline-none font-mono" />
                      </div>
                      <div className="flex-1 inset-3d flex items-center px-3 py-2">
                          <span className="text-[10px] text-zinc-500 font-bold mr-2">OUT</span>
                          <input type="number" min="0" step="0.1" value={selectedClip.properties.fadeOut || 0} onChange={(e) => handlePropChange('fadeOut', parseFloat(e.target.value))} className="w-full bg-transparent text-xs text-center text-white outline-none font-mono" />
                      </div>
                  </div>
              </div>
           </div>
        )}

        {/* --- ANIMATION TAB --- */}
        {activeTab === 'Animation' && (
           <div className="space-y-6">
              <div className="space-y-3">
                  <label className="text-xs text-zinc-400 font-bold">Transition Type</label>
                   <div className="inset-3d px-2">
                       <select value={selectedClip.properties.transitionType || 'fade'} onChange={(e) => handlePropChange('transitionType', e.target.value)} className="w-full bg-transparent text-xs p-2 outline-none text-zinc-200 cursor-pointer">
                          <option value="fade" className="bg-zinc-900">Standard Fade</option>
                          <option value="slide" className="bg-zinc-900">Slide In</option>
                          <option value="zoom" className="bg-zinc-900">Zoom In</option>
                          <option value="wipe" className="bg-zinc-900">Wipe</option>
                       </select>
                   </div>
              </div>
              <div className="space-y-3">
                  <div className="flex justify-between"><label className="text-xs text-zinc-400 font-bold">Duration In</label><span className="text-xs text-white font-mono bg-white/10 px-1.5 rounded">{selectedClip.properties.fadeIn || 0}s</span></div>
                  <input type="range" min="0" max="5" step="0.1" value={selectedClip.properties.fadeIn || 0} onChange={(e) => handlePropChange('fadeIn', parseFloat(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full accent-white appearance-none cursor-pointer border border-white/5" />
              </div>
              <div className="space-y-3">
                  <div className="flex justify-between"><label className="text-xs text-zinc-400 font-bold">Duration Out</label><span className="text-xs text-white font-mono bg-white/10 px-1.5 rounded">{selectedClip.properties.fadeOut || 0}s</span></div>
                  <input type="range" min="0" max="5" step="0.1" value={selectedClip.properties.fadeOut || 0} onChange={(e) => handlePropChange('fadeOut', parseFloat(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full accent-white appearance-none cursor-pointer border border-white/5" />
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
