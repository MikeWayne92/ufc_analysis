import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter } from 'recharts';
import { Trophy, Target, Clock, Users, TrendingUp, Filter, Zap, Award, Activity, BarChart3 } from 'lucide-react';



interface Fighter {
  id: string;
  name: string;
  nick_name: string;
  wins: number;
  losses: number;
  draws: number;
  height: number;
  weight: number;
  reach: number;
  stance: string;
  dob: string;
  splm: number;
  str_acc: number;
  sapm: number;
  str_def: number;
  td_avg: number;
  td_avg_acc: number;
  td_def: number;
  sub_avg: number;
}

interface Fight {
  event_name: string;
  event_id: string;
  fight_id: string;
  r_name: string;
  r_id: string;
  b_name: string;
  b_id: string;
  division: string;
  title_fight: number;
  method: string;
  finish_round: number;
  match_time_sec: number;
  // ... add more fields as needed from the CSV header ...
}

// Type definitions for processed data
interface MethodData {
  method: string;
  count: number;
}

interface DivisionStats {
  submissions: number;
  knockouts: number;
  decisions: number;
  total: number;
}

interface DivisionData {
  division: string;
  count: number;
  submissionRate: string;
  knockoutRate: string;
  decisionRate: string;
}

interface FighterStats extends Fighter {
  totalFights: number;
  winRate: number;
}

interface AccuracyData {
  name: string;
  accuracy: number;
  winRate: number;
  totalFights: number;
}

interface ProcessedData {
  methodData: MethodData[];
  divisionData: DivisionData[];
  topFighters: FighterStats[];
  accuracyData: AccuracyData[];
  totalFights: number;
  titleFights: number;
}

// Type definitions for count objects
type MethodCounts = Record<string, number>;
type DivisionCounts = Record<string, number>;
type DivisionStatsMap = Record<string, DivisionStats>;

// Helper to safely parse numbers
const toNumber = (value: string) => {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
};

const parseFighterCSV = (content: string): Fighter[] => {
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  
  const fighters: Fighter[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const values = line.split(',').map(val => val.trim().replace(/^"|"$/g, ''));
      
      if (values.length >= 19) {
        fighters.push({
          id: values[0] || '',
          name: values[1] || '',
          nick_name: values[2] || '',
          wins: toNumber(values[3]),
          losses: toNumber(values[4]),
          draws: toNumber(values[5]),
          height: toNumber(values[6]),
          weight: toNumber(values[7]),
          reach: toNumber(values[8]),
          stance: values[9] || '',
          dob: values[10] || '',
          splm: toNumber(values[11]),
          str_acc: toNumber(values[12]),
          sapm: toNumber(values[13]),
          str_def: toNumber(values[14]),
          td_avg: toNumber(values[15]),
          td_avg_acc: toNumber(values[16]),
          td_def: toNumber(values[17]),
          sub_avg: toNumber(values[18]),
        } as Fighter);
      }
    } catch (error) {
      console.warn('Error parsing fighter line:', line, error);
    }
  }
  
  console.log(`Parsed ${fighters.length} fighters from CSV`);
  return fighters;
};

const parseFightCSV = (content: string): Fight[] => {
  // Use a more robust CSV parser that handles quoted fields and line breaks
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  
  const fights: Fight[] = [];
  let currentLine = '';
  let inQuotes = false;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle quoted fields that span multiple lines
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '"') {
        inQuotes = !inQuotes;
      }
    }
    
    currentLine += line;
    
    // If we're not in quotes, we can process this line
    if (!inQuotes && currentLine.trim()) {
      try {
        // Simple CSV parsing - split by comma but be careful with quoted fields
        const values = currentLine.split(',').map(val => val.trim().replace(/^"|"$/g, ''));
        
        if (values.length >= 12) {
          fights.push({
            event_name: values[0] || '',
            event_id: values[1] || '',
            fight_id: values[2] || '',
            r_name: values[3] || '',
            r_id: values[4] || '',
            b_name: values[5] || '',
            b_id: values[6] || '',
            division: values[7] || '',
            title_fight: toNumber(values[8]),
            method: values[9] || '',
            finish_round: toNumber(values[10]),
            match_time_sec: toNumber(values[11]),
          } as Fight);
        }
      } catch (error) {
        console.warn('Error parsing fight line:', currentLine, error);
      }
      
      currentLine = '';
    } else {
      currentLine += '\n';
    }
  }
  
  console.log(`Parsed ${fights.length} fights from CSV`);
  return fights;
};

const UFCDashboard = () => {
  const [fights, setFights] = useState<Fight[]>([]);
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading CSV files...');
        
        // Load CSV files using fetch API
        const [fightResponse, fighterResponse] = await Promise.all([
          fetch('/fight_details.csv'),
          fetch('/fighter_details.csv')
        ]);
        
        if (!fightResponse.ok) {
          throw new Error(`Failed to load fight details: ${fightResponse.status}`);
        }
        
        if (!fighterResponse.ok) {
          throw new Error(`Failed to load fighter details: ${fighterResponse.status}`);
        }
        
        const fightContent = await fightResponse.text();
        const fighterContent = await fighterResponse.text();
        
        console.log('CSV files loaded, parsing data...');
        console.log('Fight content length:', fightContent.length);
        console.log('Fighter content length:', fighterContent.length);
        
        // Debug: Show first few lines of each CSV
        console.log('Fight CSV first 200 chars:', fightContent.substring(0, 200));
        console.log('Fighter CSV first 200 chars:', fighterContent.substring(0, 200));
        
        const fightData = parseFightCSV(fightContent);
        const fighterData = parseFighterCSV(fighterContent);
        
        console.log('Parsed fights:', fightData.length);
        console.log('Parsed fighters:', fighterData.length);
        
        // Debug: Check first few records
        if (fightData.length > 0) {
          console.log('Sample fight:', fightData[0]);
        }
        if (fighterData.length > 0) {
          console.log('Sample fighter:', fighterData[0]);
        }
        
        setFights(fightData);
        setFighters(fighterData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Process data for visualizations
  const processedData = useMemo(() => {
    console.log('Processing data - fights:', fights.length, 'fighters:', fighters.length);
    
    if (!fights.length || !fighters.length) {
      console.log('No data available for processing');
      return {
        methodData: [],
        divisionData: [],
        topFighters: [],
        accuracyData: [],
        totalFights: 0,
        titleFights: 0
      } as ProcessedData;
    }

    // Filter fights based on selection
    let filteredFights = fights;
    console.log('Total fights before filtering:', filteredFights.length);
    
    if (selectedDivision !== 'all') {
      filteredFights = filteredFights.filter(f => f.division === selectedDivision);
      console.log('Fights after division filter:', filteredFights.length);
    }
    if (selectedMethod !== 'all') {
      filteredFights = filteredFights.filter(f => f.method === selectedMethod);
      console.log('Fights after method filter:', filteredFights.length);
    }

    // Method distribution
    const methodCounts: MethodCounts = {};
    filteredFights.forEach(fight => {
      if (fight.method) {
        methodCounts[fight.method] = (methodCounts[fight.method] || 0) + 1;
      }
    });
    
    console.log('Method counts:', methodCounts);

    const methodData: MethodData[] = Object.entries(methodCounts)
      .map(([method, count]) => ({ method, count: count as number }))
      .sort((a, b) => b.count - a.count);

    // Division statistics
    const divisionCounts: DivisionCounts = {};
    const divisionStatsMap: DivisionStatsMap = {};
    
    fights.forEach(fight => {
      if (fight.division) {
        divisionCounts[fight.division] = (divisionCounts[fight.division] || 0) + 1;
        
        if (!divisionStatsMap[fight.division]) {
          divisionStatsMap[fight.division] = {
            submissions: 0,
            knockouts: 0,
            decisions: 0,
            total: 0
          };
        }
        
        divisionStatsMap[fight.division].total++;
        
        if (fight.method === 'Submission') {
          divisionStatsMap[fight.division].submissions++;
        } else if (fight.method === 'KO/TKO') {
          divisionStatsMap[fight.division].knockouts++;
        } else if (fight.method && fight.method.includes('Decision')) {
          divisionStatsMap[fight.division].decisions++;
        }
      }
    });

    const topDivisions = Object.entries(divisionCounts)
      .filter(([_, count]) => (count as number) > 50)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10);

    const divisionData: DivisionData[] = topDivisions.map(([division, count]) => {
      const stats = divisionStatsMap[division];
      return {
        division,
        count: count as number,
        submissionRate: (stats.submissions / stats.total * 100).toFixed(1),
        knockoutRate: (stats.knockouts / stats.total * 100).toFixed(1),
        decisionRate: (stats.decisions / stats.total * 100).toFixed(1)
      };
    });

    // Fighter statistics
    const fighterStats: FighterStats[] = fighters.map(fighter => ({
      ...fighter,
      totalFights: (fighter.wins || 0) + (fighter.losses || 0) + (fighter.draws || 0),
      winRate: fighter.wins / ((fighter.wins || 0) + (fighter.losses || 0) + (fighter.draws || 0)) * 100 || 0
    })).filter(f => f.totalFights > 0);

    // Top fighters by wins
    const topFighters: FighterStats[] = fighterStats
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 15);

    // Strike accuracy vs win rate
    const accuracyData: AccuracyData[] = fighterStats
      .filter(f => f.str_acc > 0 && f.totalFights >= 5)
      .slice(0, 100)
      .map(f => ({
        name: f.name,
        accuracy: f.str_acc,
        winRate: f.winRate,
        totalFights: f.totalFights
      }));

    const result = {
      methodData,
      divisionData,
      topFighters,
      accuracyData,
      totalFights: filteredFights.length,
      titleFights: filteredFights.filter(f => f.title_fight === 1).length
    } as ProcessedData;
    
    console.log('Processed data result:', result);
    return result;
  }, [fights, fighters, selectedDivision, selectedMethod]);

  const mainDivisions = ['lightweight', 'welterweight', 'middleweight', 'featherweight', 'heavyweight', 'bantamweight', 'light heavyweight', 'flyweight'];
  const mainMethods = ['Submission', 'KO/TKO', 'Decision - Unanimous', 'Decision - Split', 'Decision - Majority'];

  // UFC-inspired color palette
  const COLORS = {
    primary: '#000000',      // Black
    secondary: '#1a1a1a',    // Dark gray
    accent: '#dc2626',       // UFC Red
    highlight: '#fbbf24',    // Gold
    success: '#059669',      // Green
    warning: '#d97706',      // Orange
    info: '#2563eb',         // Blue
    light: '#f8fafc',        // Light gray
    dark: '#0f172a',         // Dark blue
    silver: '#94a3b8',       // Silver
    gradient1: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',    // Red gradient
    gradient2: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',    // Gold gradient
    gradient3: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',    // Blue gradient
    gradient4: 'linear-gradient(135deg, #059669 0%, #047857 100%)'     // Green gradient
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-transparent border-t-red-600 border-r-blue-500 border-b-green-500 border-l-yellow-500 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-t-red-600 border-r-blue-500 border-b-green-500 border-l-yellow-500 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading UFC Data</h2>
          <p className="text-gray-300">Analyzing fight statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Data</h2>
          <div className="bg-red-800/50 border border-red-600 text-red-100 px-6 py-4 rounded-lg mb-6">
            <p className="font-semibold">{error}</p>
          </div>
          <p className="text-red-200">Please check that the CSV files are available and try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-yellow-600/20 to-blue-600/20"></div>
        <div className="relative bg-gradient-to-r from-red-600 via-yellow-500 to-blue-600 p-8 shadow-2xl">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
                  UFC Fight Analysis
                </h1>
                <p className="text-xl text-white/90 font-light">
                  Comprehensive analysis of UFC fights and fighters (1994-2025)
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 mx-6 mt-6 rounded-2xl shadow-xl">
        <div className="p-6">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-white text-lg">Filters</span>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="text-white font-medium">Division:</label>
              <select 
                value={selectedDivision} 
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <option value="all">All Divisions</option>
                {mainDivisions.map(division => (
                  <option key={division} value={division} className="bg-gray-800 text-white">
                    {division.charAt(0).toUpperCase() + division.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-white font-medium">Method:</label>
              <select 
                value={selectedMethod} 
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <option value="all">All Methods</option>
                {mainMethods.map(method => (
                  <option key={method} value={method} className="bg-gray-800 text-white">{method}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-6 mt-8">
        <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/50 to-red-700/50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium mb-1">Total Fights</p>
                <p className="text-3xl font-bold text-white">{processedData.totalFights?.toLocaleString() || '0'}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-all">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/50 to-yellow-700/50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium mb-1">Title Fights</p>
                <p className="text-3xl font-bold text-white">{processedData.titleFights?.toLocaleString() || '0'}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-all">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-blue-700/50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Fighters</p>
                <p className="text-3xl font-bold text-white">{fighters.length?.toLocaleString() || '0'}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-all">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/50 to-green-700/50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Finish Rate</p>
                <p className="text-3xl font-bold text-white">
                  {processedData.totalFights ? ((processedData.totalFights - (processedData.methodData?.find(m => m.method.includes('Decision'))?.count || 0)) / processedData.totalFights * 100).toFixed(1) : '0'}%
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-all">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-6 mt-8">
        {/* Fight Methods */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Fight Methods Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={processedData.methodData?.slice(0, 8) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="method" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fill: 'white', fontSize: 12 }}
              />
              <YAxis tick={{ fill: 'white', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="url(#redGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Division Statistics */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Top Divisions by Fight Count</h2>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={processedData.divisionData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="division" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fill: 'white', fontSize: 12 }}
              />
              <YAxis tick={{ fill: 'white', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="url(#blueGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Fighters */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Top Fighters by Wins</h2>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={processedData.topFighters || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fill: 'white', fontSize: 10 }}
              />
              <YAxis tick={{ fill: 'white', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar 
                dataKey="wins" 
                fill="url(#goldGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Finish Rates by Division */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Finish Rates by Division</h2>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={processedData.divisionData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="division" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fill: 'white', fontSize: 12 }}
              />
              <YAxis tick={{ fill: 'white', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar 
                dataKey="submissionRate" 
                fill="url(#greenGradient)" 
                name="Submission %" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="knockoutRate" 
                fill="url(#orangeGradient)" 
                name="Knockout %" 
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fighter Performance Analysis */}
      <div className="mt-8 px-6">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-slate-500 to-slate-600 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Fighter Performance: Strike Accuracy vs Win Rate</h2>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="accuracy" 
                name="Strike Accuracy %"
                tick={{ fill: 'white', fontSize: 12 }}
              />
              <YAxis 
                dataKey="winRate" 
                name="Win Rate %"
                tick={{ fill: 'white', fontSize: 12 }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-black/90 backdrop-blur-sm p-4 border border-white/20 rounded-lg shadow-xl">
                        <p className="font-semibold text-white text-lg">{data.name}</p>
                        <p className="text-green-400">Strike Accuracy: {data.accuracy}%</p>
                        <p className="text-blue-400">Win Rate: {data.winRate.toFixed(1)}%</p>
                        <p className="text-yellow-400">Total Fights: {data.totalFights}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                data={processedData.accuracyData || []} 
                fill="url(#silverGradient)"
              />
              <defs>
                <radialGradient id="silverGradient">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#64748b" />
                </radialGradient>
              </defs>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="mt-8 px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Division Details Table */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Division Analysis</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="px-4 py-3 text-left text-white font-semibold">Division</th>
                    <th className="px-4 py-3 text-right text-white font-semibold">Fights</th>
                    <th className="px-4 py-3 text-right text-white font-semibold">Sub %</th>
                    <th className="px-4 py-3 text-right text-white font-semibold">KO %</th>
                    <th className="px-4 py-3 text-right text-white font-semibold">Dec %</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.divisionData?.map((division, index) => (
                    <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{division.division}</td>
                      <td className="px-4 py-3 text-right text-white">{division.count as number}</td>
                      <td className="px-4 py-3 text-right text-green-400">{division.submissionRate}%</td>
                      <td className="px-4 py-3 text-right text-red-400">{division.knockoutRate}%</td>
                      <td className="px-4 py-3 text-right text-blue-400">{division.decisionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Fighters Table */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Top Fighters by Win Rate (Min 10 fights)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="px-4 py-3 text-left text-white font-semibold">Fighter</th>
                    <th className="px-4 py-3 text-right text-white font-semibold">W-L-D</th>
                    <th className="px-4 py-3 text-right text-white font-semibold">Win %</th>
                    <th className="px-4 py-3 text-right text-white font-semibold">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {fighters
                    .map(fighter => ({
                      ...fighter,
                      totalFights: (fighter.wins || 0) + (fighter.losses || 0) + (fighter.draws || 0),
                      winRate: fighter.wins / ((fighter.wins || 0) + (fighter.losses || 0) + (fighter.draws || 0)) * 100 || 0
                    }))
                    .filter(f => f.totalFights >= 10)
                    .sort((a, b) => b.winRate - a.winRate)
                    .slice(0, 15)
                    .map((fighter, index) => (
                      <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{fighter.name}</td>
                        <td className="px-4 py-3 text-right text-white">
                          {fighter.wins}-{fighter.losses}-{fighter.draws}
                        </td>
                        <td className="px-4 py-3 text-right text-green-400">{fighter.winRate.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right text-blue-400">{fighter.str_acc || 0}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-gradient-to-r from-gray-800/50 via-black/50 to-gray-800/50 backdrop-blur-sm border border-white/20 mx-6 mb-8 rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-yellow-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">Key Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mb-4">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-3">Fight Outcomes</h3>
            <p className="text-gray-300 leading-relaxed">
              Decisions are the most common outcome ({(processedData.methodData?.find(m => m.method.includes('Decision'))?.count as number) || 0} fights), 
              followed by knockouts and submissions. This reflects the high skill level in modern UFC.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-3">Popular Divisions</h3>
            <p className="text-gray-300 leading-relaxed">
              Lightweight and Welterweight are the most active divisions, likely due to optimal size 
              for both power and speed, attracting many elite athletes.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-3">Performance Metrics</h3>
            <p className="text-gray-300 leading-relaxed">
              Strike accuracy varies significantly among fighters, but doesn't always correlate directly 
              with win rate, suggesting multiple paths to success in MMA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UFCDashboard;