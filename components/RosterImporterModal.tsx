import React, { useState, useMemo } from 'react';
import { Team, Player, LeagueLevel } from '../types';
import { X, Upload, FileText, Check, AlertCircle, Download, RefreshCw, FileSpreadsheet, Info } from 'lucide-react';

export interface RosterImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  currentTeamId?: string;
  onApplyRoster: (updatedTeams: Team[]) => void;
  onResetToDefaults: () => void;
}

interface ParsedPlayerRow {
  teamNameOrId?: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  rating: number;
  age: number;
  isValid: boolean;
  error?: string;
}

export const RosterImporterModal: React.FC<RosterImporterModalProps> = ({
  isOpen,
  onClose,
  teams,
  currentTeamId,
  onApplyRoster,
  onResetToDefaults
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    currentTeamId || (teams[0]?.id || '')
  );
  const [importMode, setImportMode] = useState<'single' | 'batch'>('single');
  const [rawText, setRawText] = useState<string>('');
  const [replaceMode, setReplaceMode] = useState<'replace' | 'merge'>('replace');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];

  // Parse raw text into structured player rows
  const parsedRows = useMemo<ParsedPlayerRow[]>(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const rows: ParsedPlayerRow[] = [];

    // Try JSON format first
    if (rawText.trim().startsWith('[') && rawText.trim().endsWith(']')) {
      try {
        const json = JSON.parse(rawText.trim());
        if (Array.isArray(json)) {
          for (const item of json) {
            const name = String(item.name || '').trim();
            const rawPos = String(item.position || item.pos || '').trim().toUpperCase();
            let position: 'GK' | 'DEF' | 'MID' | 'FWD' = 'MID';
            if (rawPos.includes('GK') || rawPos === 'GOALKEEPER') position = 'GK';
            else if (['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(rawPos)) position = 'DEF';
            else if (['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'].includes(rawPos)) position = 'MID';
            else if (['FWD', 'ST', 'CF', 'LW', 'RW'].includes(rawPos)) position = 'FWD';

            const rating = Number(item.rating || item.ovr || 75);
            const age = Number(item.age || 25);
            const teamNameOrId = item.team || item.teamId || item.club;

            const isValid = Boolean(name && rating >= 40 && rating <= 99 && age >= 15 && age <= 45);
            rows.push({
              teamNameOrId,
              name: name || 'Unknown Player',
              position,
              rating: Math.min(99, Math.max(40, rating || 75)),
              age: Math.min(45, Math.max(15, age || 25)),
              isValid,
              error: !name ? 'Missing name' : undefined
            });
          }
          return rows;
        }
      } catch {
        // Fall back to line parsing
      }
    }

    // Line-by-line CSV / TSV parsing
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip commented lines or markdown separators
      if (line.startsWith('#') || line.startsWith('---')) continue;

      // Handle CSV or tab-separated values
      // Support quotes: "Manchester City", "Erling Haaland", FWD, 91, 26
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map(p => p.trim().replace(/^["']|["']$/g, ''));
      } else {
        parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      }

      // Skip header row if detected
      const firstCellLower = parts[0]?.toLowerCase();
      if (
        i === 0 &&
        (firstCellLower === 'name' ||
          firstCellLower === 'player' ||
          firstCellLower === '姓名' ||
          firstCellLower === 'team' ||
          firstCellLower === '球队' ||
          firstCellLower === 'club')
      ) {
        continue;
      }

      let teamNameOrId: string | undefined;
      let name = '';
      let posStr = '';
      let ratingNum = 75;
      let ageNum = 25;

      // If 5 columns or first column matches a known team: [Team, Name, Position, Rating, Age]
      const matchesAnyTeam = teams.some(
        t => t.id.toLowerCase() === parts[0]?.toLowerCase() || t.name.toLowerCase() === parts[0]?.toLowerCase()
      );

      if (parts.length >= 5 || matchesAnyTeam) {
        teamNameOrId = parts[0];
        name = parts[1] || '';
        posStr = parts[2] || '';
        ratingNum = parseInt(parts[3] || '75', 10);
        ageNum = parseInt(parts[4] || '25', 10);
      } else {
        // [Name, Position, Rating, Age]
        name = parts[0] || '';
        posStr = parts[1] || '';
        ratingNum = parseInt(parts[2] || '75', 10);
        ageNum = parseInt(parts[3] || '25', 10);
      }

      // Normalize position
      const cleanPos = posStr.toUpperCase().trim();
      let position: 'GK' | 'DEF' | 'MID' | 'FWD' = 'MID';
      if (cleanPos.includes('GK') || cleanPos === '门将' || cleanPos === '守门员') {
        position = 'GK';
      } else if (['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB', '后卫'].includes(cleanPos)) {
        position = 'DEF';
      } else if (['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM', '中场'].includes(cleanPos)) {
        position = 'MID';
      } else if (['FWD', 'ST', 'CF', 'LW', 'RW', '前锋'].includes(cleanPos)) {
        position = 'FWD';
      }

      const isValidName = Boolean(name && name.length >= 2);
      const isValidRating = !isNaN(ratingNum) && ratingNum >= 40 && ratingNum <= 99;
      const isValidAge = !isNaN(ageNum) && ageNum >= 15 && ageNum <= 45;

      let errorMsg: string | undefined;
      if (!isValidName) errorMsg = '姓名无效';
      else if (!isValidRating) errorMsg = '评分需在 40-99 之间';
      else if (!isValidAge) errorMsg = '年龄需在 15-45 之间';

      rows.push({
        teamNameOrId,
        name,
        position,
        rating: isNaN(ratingNum) ? 75 : Math.min(99, Math.max(40, ratingNum)),
        age: isNaN(ageNum) ? 25 : Math.min(45, Math.max(15, ageNum)),
        isValid: isValidName && isValidRating && isValidAge,
        error: errorMsg
      });
    }

    return rows;
  }, [rawText, teams]);

  const validRows = parsedRows.filter(r => r.isValid);
  const gkCount = validRows.filter(r => r.position === 'GK').length;
  const defCount = validRows.filter(r => r.position === 'DEF').length;
  const midCount = validRows.filter(r => r.position === 'MID').length;
  const fwdCount = validRows.filter(r => r.position === 'FWD').length;
  const avgRating = validRows.length
    ? Math.round(validRows.reduce((acc, r) => acc + r.rating, 0) / validRows.length)
    : 0;

  // Handle file input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        setStatusMessage({ type: 'success', text: `成功载入文件: ${file.name}` });
      }
    };
    reader.onerror = () => {
      setStatusMessage({ type: 'error', text: '读取文件失败' });
    };
    reader.readAsText(file);
  };

  // Load sample template into textarea
  const handleLoadSample = () => {
    if (importMode === 'single') {
      const sample = `# 球员名单格式：姓名, 位置(GK/DEF/MID/FWD), 评分(40-99), 年龄(15-45)
David Raya, GK, 85, 31
Kepa Arrizabalaga, GK, 83, 32
William Saliba, DEF, 88, 25
Gabriel Magalhaes, DEF, 87, 28
Jurrien Timber, DEF, 83, 25
Ben White, DEF, 85, 29
Riccardo Calafiori, DEF, 83, 24
Oleksandr Zinchenko, DEF, 81, 29
Declan Rice, MID, 87, 27
Martin Odegaard, MID, 89, 27
Mikel Merino, MID, 84, 30
Thomas Partey, MID, 83, 33
Jorginho, MID, 81, 34
Ethan Nwaneri, MID, 79, 19
Bukayo Saka, FWD, 89, 25
Kai Havertz, FWD, 86, 27
Gabriel Martinelli, FWD, 85, 25
Leandro Trossard, FWD, 84, 31
Gabriel Jesus, FWD, 83, 29
Raheem Sterling, FWD, 82, 31`;
      setRawText(sample);
    } else {
      const sample = `# 多队批量格式：球队名/ID, 姓名, 位置, 评分, 年龄
Arsenal, Bukayo Saka, FWD, 89, 25
Arsenal, Declan Rice, MID, 87, 27
Arsenal, William Saliba, DEF, 88, 25
Arsenal, David Raya, GK, 85, 31
Chelsea, Cole Palmer, MID, 89, 24
Chelsea, Moises Caicedo, MID, 86, 24
Chelsea, Enzo Fernandez, MID, 85, 25
Chelsea, Robert Sanchez, GK, 81, 28`;
      setRawText(sample);
    }
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    let content = '\uFEFF';
    if (importMode === 'single') {
      content += '姓名,位置,评分,年龄\n';
      content += 'Erling Haaland,FWD,91,26\n';
      content += 'Kevin De Bruyne,MID,89,35\n';
      content += 'Rodri,MID,91,30\n';
      content += 'Ruben Dias,DEF,88,29\n';
      content += 'Ederson,GK,87,33\n';
    } else {
      content += '球队,姓名,位置,评分,年龄\n';
      content += 'Manchester City,Erling Haaland,FWD,91,26\n';
      content += 'Arsenal,Bukayo Saka,FWD,89,25\n';
      content += 'Liverpool,Mohamed Salah,FWD,90,34\n';
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster_template_${importMode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply parsed roster to teams
  const handleApply = () => {
    if (validRows.length === 0) {
      setStatusMessage({ type: 'error', text: '未发现有效的球员数据，请先填入或导入数据。' });
      return;
    }

    const updatedTeams = teams.map(t => ({ ...t, players: [...t.players] }));

    if (importMode === 'single') {
      const targetTeam = updatedTeams.find(t => t.id === selectedTeamId);
      if (!targetTeam) return;

      const newPlayers: Player[] = validRows.map((r, idx) => {
        const existingPlayer = targetTeam.players.find(
          p => p.name.trim().toLowerCase() === r.name.trim().toLowerCase()
        );

        return {
          id: existingPlayer?.id || `${targetTeam.id}-CUSTOM-${idx + 1}-${Date.now().toString().slice(-4)}`,
          name: r.name,
          position: r.position,
          rating: r.rating,
          age: r.age,
          form: existingPlayer?.form ?? (7 + Math.floor(Math.random() * 3)),
          goals: existingPlayer?.goals ?? 0,
          assists: existingPlayer?.assists ?? 0,
          matchesPlayed: existingPlayer?.matchesPlayed ?? 0,
          yellowCards: existingPlayer?.yellowCards ?? 0,
          redCards: existingPlayer?.redCards ?? 0,
          matchesBanned: existingPlayer?.matchesBanned ?? 0,
          injury: existingPlayer?.injury ?? 0
        };
      });

      if (replaceMode === 'replace') {
        targetTeam.players = newPlayers;
      } else {
        // Merge mode: overwrite existing players by name, append others
        const merged = [...targetTeam.players];
        newPlayers.forEach(np => {
          const idx = merged.findIndex(p => p.name.trim().toLowerCase() === np.name.trim().toLowerCase());
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], position: np.position, rating: np.rating, age: np.age };
          } else {
            merged.push(np);
          }
        });
        targetTeam.players = merged;
      }

      // Re-calculate team ATT, MID, DEF from top players
      const topFwds = targetTeam.players.filter(p => p.position === 'FWD').sort((a, b) => b.rating - a.rating);
      const topMids = targetTeam.players.filter(p => p.position === 'MID').sort((a, b) => b.rating - a.rating);
      const topDefs = targetTeam.players.filter(p => p.position === 'DEF').sort((a, b) => b.rating - a.rating);

      if (topFwds.length > 0) {
        targetTeam.att = Math.round(topFwds.slice(0, 3).reduce((acc, p) => acc + p.rating, 0) / Math.min(topFwds.length, 3));
      }
      if (topMids.length > 0) {
        targetTeam.mid = Math.round(topMids.slice(0, 3).reduce((acc, p) => acc + p.rating, 0) / Math.min(topMids.length, 3));
      }
      if (topDefs.length > 0) {
        targetTeam.def = Math.round(topDefs.slice(0, 4).reduce((acc, p) => acc + p.rating, 0) / Math.min(topDefs.length, 4));
      }
    } else {
      // Batch mode: match players by teamNameOrId
      let matchedCount = 0;
      for (const row of validRows) {
        if (!row.teamNameOrId) continue;
        const targetTeam = updatedTeams.find(
          t =>
            t.id.toLowerCase() === row.teamNameOrId?.toLowerCase() ||
            t.name.toLowerCase() === row.teamNameOrId?.toLowerCase()
        );
        if (!targetTeam) continue;

        matchedCount++;
        const existingIdx = targetTeam.players.findIndex(
          p => p.name.trim().toLowerCase() === row.name.trim().toLowerCase()
        );

        if (existingIdx !== -1) {
          targetTeam.players[existingIdx] = {
            ...targetTeam.players[existingIdx],
            position: row.position,
            rating: row.rating,
            age: row.age
          };
        } else {
          targetTeam.players.push({
            id: `${targetTeam.id}-BATCH-${targetTeam.players.length + 1}-${Date.now().toString().slice(-4)}`,
            name: row.name,
            position: row.position,
            rating: row.rating,
            age: row.age,
            form: 7 + Math.floor(Math.random() * 3),
            goals: 0,
            assists: 0,
            matchesPlayed: 0,
            yellowCards: 0,
            redCards: 0,
            matchesBanned: 0,
            injury: 0
          });
        }
      }

      if (matchedCount === 0) {
        setStatusMessage({ type: 'error', text: '未匹配到任何已存在的球队，请检查球队名称或ID。' });
        return;
      }
    }

    onApplyRoster(updatedTeams);
    onClose();
  };

  const getPosBadgeColor = (pos: string) => {
    switch (pos) {
      case 'GK': return 'bg-yellow-600 text-black font-bold';
      case 'DEF': return 'bg-blue-600 text-white font-bold';
      case 'MID': return 'bg-green-600 text-white font-bold';
      case 'FWD': return 'bg-red-600 text-white font-bold';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-850">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">球队阵容与球员导入</h2>
              <p className="text-xs text-gray-400">支持 Excel / WPS 表格复制粘贴、CSV 文件导入或 JSON 格式</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-sm flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-green-900/40 text-green-300 border-b border-green-800/50'
                : 'bg-red-900/40 text-red-300 border-b border-red-800/50'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-xs opacity-75 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                导入目标
              </label>
              <div className="flex rounded-lg bg-gray-800 p-1 border border-gray-700">
                <button
                  type="button"
                  onClick={() => setImportMode('single')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    importMode === 'single' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  单支球队
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('batch')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    importMode === 'batch' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  多队批量 (按列)
                </button>
              </div>
            </div>

            {importMode === 'single' && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                  选择球队
                </label>
                <select
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.league}) - 现有 {t.players.length} 人
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                应用模式
              </label>
              <select
                value={replaceMode}
                onChange={e => setReplaceMode(e.target.value as any)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="replace">全量覆盖 (用导入名单完全替换)</option>
                <option value="merge">增量合并 (同名更新，不同名新增)</option>
              </select>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                <Upload size={14} />
                <span>选择本地文件 (.csv / .txt / .json)</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <FileText size={14} />
                <span>载入示例数据</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
            >
              <Download size={14} />
              <span>下载 CSV 导入模板</span>
            </button>
          </div>

          {/* Text Input Area */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-gray-300 uppercase">
                粘贴球员数据 (支持直接从 Excel / WPS 复制):
              </label>
              <span className="text-xs text-gray-500">
                {importMode === 'single'
                  ? '格式: 姓名, 位置(GK/DEF/MID/FWD), 评分(40-99), 年龄'
                  : '格式: 球队名, 姓名, 位置, 评分, 年龄'}
              </span>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={
                importMode === 'single'
                  ? `例如：\nDavid Raya, GK, 85, 31\nWilliam Saliba, DEF, 88, 25\nDeclan Rice, MID, 87, 27\nBukayo Saka, FWD, 89, 25`
                  : `例如：\nArsenal, David Raya, GK, 85, 31\nChelsea, Cole Palmer, MID, 89, 24`
              }
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500 custom-scrollbar"
            />
          </div>

          {/* Parse Summary & Statistics */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-gray-800/80 border border-gray-700/60 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase text-gray-400 font-semibold">识别有效球员</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {validRows.length} <span className="text-xs text-gray-500">/ {parsedRows.length}</span>
                  </div>
                </div>
                <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase text-yellow-400 font-semibold">门将 (GK)</div>
                  <div className="text-xl font-bold text-yellow-400 mt-0.5">{gkCount}</div>
                </div>
                <div className="bg-blue-950/20 border border-blue-800/40 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase text-blue-400 font-semibold">后卫 (DEF)</div>
                  <div className="text-xl font-bold text-blue-400 mt-0.5">{defCount}</div>
                </div>
                <div className="bg-green-950/20 border border-green-800/40 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase text-green-400 font-semibold">中场 (MID)</div>
                  <div className="text-xl font-bold text-green-400 mt-0.5">{midCount}</div>
                </div>
                <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase text-red-400 font-semibold">前锋 (FWD)</div>
                  <div className="text-xl font-bold text-red-400 mt-0.5">{fwdCount}</div>
                </div>
              </div>

              {/* Warnings */}
              {gkCount < 2 && importMode === 'single' && (
                <div className="flex items-center gap-2 p-3 bg-yellow-900/30 border border-yellow-700/60 rounded-xl text-yellow-300 text-xs">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>建议至少包含 2 名门将（GK），以防主力门将受伤或停赛。</span>
                </div>
              )}

              {/* Preview Table */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">解析预览 (前 20 条):</h4>
                <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-900 text-gray-400 border-b border-gray-800 sticky top-0">
                      <tr>
                        {importMode === 'batch' && <th className="px-3 py-2">球队</th>}
                        <th className="px-3 py-2">位置</th>
                        <th className="px-3 py-2">姓名</th>
                        <th className="px-3 py-2 text-center">评分</th>
                        <th className="px-3 py-2 text-center">年龄</th>
                        <th className="px-3 py-2 text-right">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850">
                      {parsedRows.slice(0, 20).map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-gray-900/50' : 'bg-red-950/20'}>
                          {importMode === 'batch' && (
                            <td className="px-3 py-1.5 text-gray-300 font-medium">
                              {row.teamNameOrId || '-'}
                            </td>
                          )}
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${getPosBadgeColor(row.position)}`}>
                              {row.position}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 font-medium text-gray-200">
                            {row.name}
                          </td>
                          <td className="px-3 py-1.5 text-center font-bold text-blue-400">
                            {row.rating}
                          </td>
                          <td className="px-3 py-1.5 text-center text-gray-400">
                            {row.age}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            {row.isValid ? (
                              <span className="text-green-400 inline-flex items-center gap-1">
                                <Check size={12} /> 正常
                              </span>
                            ) : (
                              <span className="text-red-400" title={row.error}>
                                {row.error || '无效'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-850 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('确定要恢复所有球队的默认官方名单吗？所有自定义导入将被重置。')) {
                onResetToDefaults();
                onClose();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            <RefreshCw size={14} />
            <span>恢复默认初始名单</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={validRows.length === 0}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold shadow-lg transition-all ${
                validRows.length > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check size={16} />
              <span>应用并保存名单 ({validRows.length} 名球员)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
