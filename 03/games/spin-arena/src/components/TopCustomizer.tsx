import React, { useState } from 'react';
import type { TopDefinition } from '../types';

interface TopCustomizerProps {
  initialTops: TopDefinition[];
  onSave: (tops: TopDefinition[]) => void;
  onBack: () => void;
}

const TopCustomizer: React.FC<TopCustomizerProps> = ({ initialTops, onSave, onBack }) => {
  const [tops, setTops] = useState<TopDefinition[]>(initialTops);
  const [newTop, setNewTop] = useState({ name: '', baseSpeed: 2.0, hp: 100 });

  const handleEdit = (index: number, field: keyof TopDefinition, value: string | number) => {
    const updatedTops = [...tops];
    const parsedValue = typeof updatedTops[index][field] === 'number' ? Number(value) : value;
    (updatedTops[index] as any)[field] = parsedValue;
    setTops(updatedTops);
  };

  const handleAddNew = () => {
    if (newTop.name.trim() === '') {
      alert('New top name cannot be empty.');
      return;
    }
    const updatedTops = [...tops, newTop];
    setTops(updatedTops);
    setNewTop({ name: '', baseSpeed: 2.0, hp: 100 });
  };

  const handleDelete = (index: number) => {
    const updatedTops = tops.filter((_, i) => i !== index);
    setTops(updatedTops);
  };

  const handleSaveChanges = () => {
    onSave(tops);
    alert('Tops saved!');
  };

  return (
    <div className="w-full max-w-4xl text-white">
      <h2 className="text-3xl font-bold text-center mb-6">Customize Tops</h2>
      
      <div className="space-y-4 mb-8">
        {tops.map((top, index) => (
          <div key={index} className="p-4 bg-slate-800 rounded-lg flex flex-col gap-4 border border-slate-700">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Name</label>
                <input type="text" value={top.name} onChange={(e) => handleEdit(index, 'name', e.target.value)} className="w-full bg-slate-900 p-2 rounded border border-slate-700" />
              </div>
              <div className="w-24">
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Speed</label>
                <input type="number" step="0.1" value={top.baseSpeed} onChange={(e) => handleEdit(index, 'baseSpeed', e.target.value)} className="w-full bg-slate-900 p-2 rounded border border-slate-700" />
              </div>
              <div className="w-24">
                <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">HP</label>
                <input type="number" value={top.hp} onChange={(e) => handleEdit(index, 'hp', e.target.value)} className="w-full bg-slate-900 p-2 rounded border border-slate-700" />
              </div>
              <button onClick={() => handleDelete(index)} className="bg-red-600 hover:bg-red-700 p-2 rounded px-4 mt-5">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
        <h3 className="text-xl font-bold mb-4">Add New Top</h3>
        <div className="flex gap-4 items-center">
           <div className="flex-1">
             <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Name</label>
             <input type="text" placeholder="Name" value={newTop.name} onChange={(e) => setNewTop({...newTop, name: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700" />
           </div>
           <div className="w-24">
             <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Speed</label>
             <input type="number" step="0.1" value={newTop.baseSpeed} onChange={(e) => setNewTop({...newTop, baseSpeed: Number(e.target.value)})} className="w-full bg-slate-900 p-2 rounded border border-slate-700" />
           </div>
           <div className="w-24">
             <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">HP</label>
             <input type="number" value={newTop.hp} onChange={(e) => setNewTop({...newTop, hp: Number(e.target.value)})} className="w-full bg-slate-900 p-2 rounded border border-slate-700" />
           </div>
           <button onClick={handleAddNew} className="bg-green-600 hover:bg-green-700 p-2 rounded px-4 mt-5">Add</button>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <button onClick={handleSaveChanges} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 font-bold rounded-lg">Save All Changes</button>
        <button onClick={onBack} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 font-bold rounded-lg">Back to Selection</button>
      </div>
    </div>
  );
};

export default TopCustomizer;
