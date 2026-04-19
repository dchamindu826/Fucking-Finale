import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';

export default function ManagerDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        // Backend eken real data ganna API eka (Mock data natha)
        const response = await api.get('/manager/dashboard-data');
        setData(response.data);
      } catch (error) {
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchManagerData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-red-500">Class Coordination Manager</h1>
        <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-bold">Logout</button>
      </div>

      {loading ? (
        <p className="text-white/50">Loading real data from server...</p>
      ) : (
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
           {/* Data display wena thena */}
           {data.length === 0 ? (
             <p className="text-white/40">No active classes or tasks found in database.</p>
           ) : (
             <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
           )}
        </div>
      )}
    </div>
  );
}