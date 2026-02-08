import React, { useState } from 'react';
import { Clip, MediaType } from '../types';
import { 
  RotateCw, RefreshCcw, Monitor, Sliders, 
  Type, Music, Zap, Gauge, AlignCenter, AlignLeft, AlignRight
} from 'lucide-react';

interface PropertiesPanelProps {
  selectedClip: Clip | undefined;
  onUpdate: (id: string, updates: Partial<Clip>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedClip, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('Video');
  const [subTab, setSubTab] = useState('Basic');

  if (!selectedClip) {
    return (
      <div className="w-full h-full bg-[#171717] border-l border-[#252525] flex flex-col items-center justify-center text-[#52525b] select-none">
        <div className="w-16 h-16 rounded-full bg-[#252525] mb-4 flex items-center justify-center">
          <Monitor size={24} className="text-[#3f3f46]" />
        </div>
        <p className="text-xs">Select a clip to edit</p>
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
    <div className="w-full h-full bg-[#171717] border-l border-[#252525] flex flex-col text-[#e4e4e7] select-none font-sans">
      {/* Tabs */}
      <div className="flex items-center px-2 pt-2 border-b border-[#252525] space-x-4 overflow-x-auto no-scrollbar">
        {TABS.filter(t => t.visible).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 text-xs font-medium transition-colors relative ${
              activeTab === tab.id ? 'text-cyan-400' : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            {tab.id}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        
        {/* --- VIDEO TAB --- */}
        {activeTab === 'Video' && (
          <>
            <div className="flex bg-[#252525] rounded p-0.5 mb-4">
               {['Basic', 'Cutout', 'Mask', 'Enhance'].map(t => (
                 <button key={t} onClick={() => setSubTab(t)} className={`flex-1 text-[10px] py-1 rounded ${subTab === t ? 'bg-[#3f3f46] text-white' : 'text-[#a1a1aa]'}`}>{t}</button>
               ))}
            </div>
            {subTab === 'Basic' && (
              <div className="space-y-6">
                {/* Scale */}
                <div className="space-y-2">
                   <div className="flex justify-between"><label className="text-xs text-[#a1a1aa]">Scale</label><span className="text-xs">{Math.round(selectedClip.properties.scale * 100)}%</span></div>
                   <input type="range" min="0.1" max="3" step="0.1" value={selectedClip.properties.scale} onChange={(e) => handlePropChange('scale', parseFloat(e.target.value))} className="w-full h-1 bg-[#3f3f46] rounded-lg accent-cyan-400" />
                </div>
                {/* Position */}
                <div className="space-y-2">
                   <label className="text-xs text-[#a1a1aa]">Position (Drag on Player)</label>
                   <div className="flex gap-2">
                     <input type="number" value={Math.round(selectedClip.properties.x)} onChange={(e) => handlePropChange('x', parseFloat(e.target.value))} className="flex-1 bg-[#252525] rounded border border-[#3f3f46] text-xs p-1 text-right" />
                     <input type="number" value={Math.round(selectedClip.properties.y)} onChange={(e) => handlePropChange('y', parseFloat(e.target.value))} className="flex-1 bg-[#252525] rounded border border-[#3f3f46] text-xs p-1 text-right" />
                   </div>
                </div>
                {/* Rotation */}
                <div className="space-y-2">
                   <div className="flex justify-between"><label className="text-xs text-[#a1a1aa]">Rotate</label><span className="text-xs">{Math.round(selectedClip.properties.rotation)}°</span></div>
                   <input type="range" min="-180" max="180" value={selectedClip.properties.rotation} onChange={(e) => handlePropChange('rotation', parseFloat(e.target.value))} className="w-full h-1 bg-[#3f3f46] rounded-lg accent-cyan-400" />
                </div>
                {/* Opacity */}
                <div className="space-y-2">
                   <div className="flex justify-between"><label className="text-xs text-[#a1a1aa]">Opacity</label><span className="text-xs">{Math.round(selectedClip.properties.opacity * 100)}%</span></div>
                   <input type="range" min="0" max="1" step="0.01" value={selectedClip.properties.opacity} onChange={(e) => handlePropChange('opacity', parseFloat(e.target.value))} className="w-full h-1 bg-[#3f3f46] rounded-lg accent-cyan-400" />
                </div>
                 {/* Blend */}
                 <div className="space-y-2">
                   <label className="text-xs text-[#a1a1aa]">Blend Mode</label>
                   <select value={selectedClip.properties.blendMode || 'normal'} onChange={(e) => handlePropChange('blendMode', e.target.value)} className="w-full bg-[#252525] border border-[#3f3f46] rounded text-xs p-1.5 outline-none text-[#e4e4e7]">
                      <option value="source-over">Normal</option>
                      <option value="overlay">Overlay</option>
                      <option value="multiply">Multiply</option>
                      <option value="screen">Screen</option>
                      <option value="lighten">Lighten</option>
                      <option value="darken">Darken</option>
                   </select>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- TEXT TAB --- */}
        {activeTab === 'Text' && (
           <div className="space-y-6">
              <div className="space-y-2">
                  <label className="text-xs text-[#a1a1aa]">Content</label>
                  <textarea 
                     className="w-full bg-[#252525] border border-[#3f3f46] rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                     rows={3}
                     value={selectedClip.name}
                     onChange={(e) => onUpdate(selectedClip.id, { name: e.target.value })}
                  />
              </div>
              <div className="space-y-2">
                  <label className="text-xs text-[#a1a1aa]">Font Family</label>
                  <select 
                    value={selectedClip.properties.fontFamily || 'Arial'} 
                    onChange={(e) => handlePropChange('fontFamily', e.target.value)} 
                    className="w-full bg-[#252525] border border-[#3f3f46] rounded text-xs p-2 outline-none text-white"
                  >
                      {FONTS.map(font => (
                          <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                      ))}
                  </select>
              </div>
              <div className="space-y-2">
                  <label className="text-xs text-[#a1a1aa]">Font Size</label>
                  <div className="flex gap-2 items-center">
                     <input type="range" min="10" max="300" value={selectedClip.properties.fontSize || 120} onChange={(e) => handlePropChange('fontSize', parseFloat(e.target.value))} className="flex-1 h-1 bg-[#3f3f46] rounded-lg accent-cyan-400" />
                     <span className="text-xs w-8 text-right">{selectedClip.properties.fontSize || 120}</span>
                  </div>
              </div>
              <div className="space-y-2">
                  <label className="text-xs text-[#a1a1aa]">Color</label>
                  <div className="flex items-center gap-2 bg-[#252525] p-1 rounded border border-[#3f3f46]">
                     <input type="color" value={selectedClip.properties.textColor || '#ffffff'} onChange={(e) => handlePropChange('textColor', e.target.value)} className="w-6 h-6 bg-transparent border-0 cursor-pointer p-0" />
                     <span className="text-xs uppercase flex-1">{selectedClip.properties.textColor || '#ffffff'}</span>
                  </div>
              </div>
              <div className="p-3 bg-[#252525] rounded border border-[#3f3f46]">
                 <p className="text-[10px] text-[#a1a1aa] flex items-center gap-2"><AlignLeft size={12} /> Drag text on the preview player to position it.</p>
              </div>
           </div>
        )}

        {/* --- ADJUST TAB --- */}
        {activeTab === 'Adjust' && (
            <div className="space-y-4">
               {['brightness', 'contrast', 'saturation'].map(filter => (
                   <div key={filter} className="space-y-1">
                       <div className="flex justify-between text-xs capitalize text-[#a1a1aa]">
                           <span>{filter}</span>
                           <span>{Math.round(((selectedClip.properties as any)[filter] - 1) * 100)}</span>
                       </div>
                       <input type="range" min="0" max="2" step="0.05" value={(selectedClip.properties as any)[filter]} onChange={(e) => handlePropChange(filter as any, parseFloat(e.target.value))} className="w-full h-1 bg-[#3f3f46] rounded-lg accent-cyan-400" />
                   </div>
               ))}
               <div className="space-y-1">
                   <div className="flex justify-between text-xs capitalize text-[#a1a1aa]"><span>Blur</span><span>{selectedClip.properties.blur || 0}px</span></div>
                   <input type="range" min="0" max="20" step="0.5" value={selectedClip.properties.blur || 0} onChange={(e) => handlePropChange('blur', parseFloat(e.target.value))} className="w-full h-1 bg-[#3f3f46] rounded-lg accent-cyan-400" />
               </div>
               <div className="space-y-1">
                   <div className="flex justify-between text-xs capitalize text-[#a1a1aa]"><span>Hue</span><span>{selectedClip.properties.hue || 0}°</span></div>
                   <div className="relative h-2 rounded overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 opacity-50" />
                      <input type="range" min="-180" max="180" value={selectedClip.properties.hue || 0} onChange={(e) => handlePropChange('hue', parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                   </div>
               </div>
            </div>
        )}
        
        {/* --- AUDIO TAB --- */}
        {activeTab === 'Audio' && (
           <div className="space-y-4">
              <div className="space-y-2">
                  <div className="flex justify-between"><label className="text-xs text-[#a1a1aa]">Volume</label><span className="text-xs">{Math.round(selectedClip.properties.volume * 100)}%</span></div>
                  <input type="range" min="0" max="2" step="0.1" value={selectedClip.properties.volume} onChange={(e) => handlePropChange('volume', parseFloat(e.target.value))} className="w-full h-1 bg-[#3f3f46] rounded-lg accent-cyan-400" />
              </div>
              <div className="space-y-2">
                  <label className="text-xs text-[#a1a1aa]">Fade In/Out (sec)</label>
                  <div className="flex gap-2">
                      <input type="number" min="0" step="0.1" placeholder="In" value={selectedClip.properties.fadeIn || 0} onChange={(e) => handlePropChange('fadeIn', parseFloat(e.target.value))} className="flex-1 bg-[#252525] rounded border border-[#3f3f46] p-1 text-xs text-center" />
                      <input type="number" min="0" step="0.1" placeholder="Out" value={selectedClip.properties.fadeOut || 0} onChange={(e) => handlePropChange('fadeOut', parseFloat(e.target.value))} className="flex-1 bg-[#252525] rounded border border-[#3f3f46] p-1 text-xs text-center" />
                  </div>
              </div>
           </div>
        )}

        {/* --- ANIMATION TAB --- */}
        {activeTab === 'Animation' && (
           <div className="space-y-4">
              <div className="space-y-2">
                  <label className="text-xs text-[#a1a1aa]">Transition Type</label>
                   <select value={selectedClip.properties.transitionType || 'fade'} onChange={(e) => handlePropChange('transitionType', e.target.value)} className="w-full bg-[#252525] border border-[#3f3f46] rounded text-xs p-1.5 outline-none text-[#e4e4e7]">
                      <option value="fade">Standard Fade</option>
                      <option value="slide">Slide In</option>
                      <option value="zoom">Zoom In</option>
                      <option value="wipe">Wipe</option>
                   </select>
              </div>
              <div className="space-y-2">
                  <div className="flex justify-between"><label className="text-xs text-[#a1a1aa]">Duration In</label><span className="text-xs">{selectedClip.properties.fadeIn || 0}s</span></div>
                  <input type="range" min="0" max="5" step="0.1" value={selectedClip.properties.fadeIn || 0} onChange={(e) => handlePropChange('fadeIn', parseFloat(e.target.value))} className="w-full h-1 bg-[#3f3f46] rounded-lg accent-cyan-400" />
              </div>
              <div className="space-y-2">
                  <div className="flex justify-between"><label className="text-xs text-[#a1a1aa]">Duration Out</label><span className="text-xs">{selectedClip.properties.fadeOut || 0}s</span></div>
                  <input type="range" min="0" max="5" step="0.1" value={selectedClip.properties.fadeOut || 0} onChange={(e) => handlePropChange('fadeOut', parseFloat(e.target.value))} className="w-full h-1 bg-[#3f3f46] rounded-lg accent-cyan-400" />
              </div>
              <div className="text-[10px] text-[#71717a] mt-2 text-center">Visual transition bars will appear on the timeline clips.</div>
           </div>
        )}
      </div>
    </div>
  );
};

