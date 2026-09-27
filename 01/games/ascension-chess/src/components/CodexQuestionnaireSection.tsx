import React, { useState, useMemo } from 'react';
import {
  CODEX_QUESTIONNAIRE_SECTIONS,
  CodexRuleQuestionItem,
  RuleDecisionAnswer,
  RuleStatus,
  downloadCodexQuestionnaireTxt,
  formatAllQuestionnaireRulesAsText,
  formatSingleRuleAsCodexText,
  loadCodexQuestionnaireRules,
  resetCodexQuestionnaireRules,
  saveCodexQuestionnaireRules,
} from '../data/codexQuestionnaireData';
import {
  Check,
  Copy,
  Download,
  Edit3,
  FileText,
  ListChecks,
  RotateCcw,
  Search,
} from 'lucide-react';

export const CodexQuestionnaireSection: React.FC = () => {
  const [rules, setRules] = useState<CodexRuleQuestionItem[]>(() =>
    loadCodexQuestionnaireRules()
  );
  const [selectedSection, setSelectedSection] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RuleStatus | 'ALL' | 'DEPENDS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'raw_txt'>('cards');
  const [editingQNum, setEditingQNum] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      total: rules.length,
      confirmed: rules.filter((r) => r.status === 'CONFIRMED').length,
      undecided: rules.filter((r) => r.status === 'UNDECIDED').length,
      superseded: rules.filter((r) => r.status === 'SUPERSEDED').length,
      depends: rules.filter((r) => r.decision === 'Depends').length,
    };
  }, [rules]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (selectedSection !== 'all' && r.sectionNumber !== selectedSection) return false;
      if (statusFilter === 'DEPENDS') {
        if (r.decision !== 'Depends') return false;
      } else if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${r.questionNumber} ${r.ruleId} ${r.ruleName} ${r.questionText} ${r.rule} ${r.appliesTo} ${r.example}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rules, selectedSection, statusFilter, searchQuery]);

  const handleUpdateRule = (
    questionNumber: number,
    updates: Partial<CodexRuleQuestionItem>
  ) => {
    setRules((prev) => {
      const next = prev.map((item) =>
        item.questionNumber === questionNumber ? { ...item, ...updates } : item
      );
      saveCodexQuestionnaireRules(next);
      return next;
    });
  };

  const handleResetDefaults = () => {
    const fresh = resetCodexQuestionnaireRules();
    setRules(fresh);
    setEditingQNum(null);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  const fullFormattedText = useMemo(
    () => formatAllQuestionnaireRulesAsText(filteredRules.length === rules.length ? rules : filteredRules),
    [rules, filteredRules]
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-900 text-slate-100">
      {/* Top Action & Filter Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <ListChecks className="w-4 h-4 text-amber-400" />
            <span>72-Question Canonical Rules Questionnaire &amp; Text-File Codex</span>
          </div>
          <div className="text-[11px] text-slate-400">
            <span>{counts.total} Rules Answered</span>
            <span className="mx-1.5">·</span>
            <span className="text-emerald-400 font-medium">{counts.confirmed} Confirmed</span>
            <span className="mx-1.5">·</span>
            <span className="text-amber-300 font-medium">{counts.depends} Depends</span>
            <span className="mx-1.5">·</span>
            <span className="text-sky-300 font-medium">{counts.undecided} Undecided</span>
            <span className="mx-1.5">·</span>
            <span className="text-rose-300 font-medium">{counts.superseded} Superseded</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented View Switcher: Interactive Cards vs. Formatted .TXT File */}
          <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors ${
                viewMode === 'cards'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>72 Rule Answers</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw_txt')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors ${
                viewMode === 'raw_txt'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Canonical .TXT View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleCopyText(formatAllQuestionnaireRulesAsText(rules), 'all')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            {copiedId === 'all' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied All 72 Rules!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Copy .TXT</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => downloadCodexQuestionnaireTxt(rules)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download 72-Rule Codex (.txt)</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            title="Reset all 72 answers to canonical game defaults"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left Sidebar: 11 Sections + Status Filter + Search */}
        <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/60 p-3 flex flex-col gap-3 overflow-y-auto max-h-56 md:max-h-none">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Q#, PAWN-07, Rook, Summit..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-semibold">
            {(
              [
                { id: 'ALL', label: `All (${counts.total})` },
                { id: 'CONFIRMED', label: `Confirmed` },
                { id: 'DEPENDS', label: `Depends (${counts.depends})` },
                { id: 'UNDECIDED', label: `Undecided` },
                { id: 'SUPERSEDED', label: `Superseded` },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2 py-1 rounded transition-colors truncate ${
                  statusFilter === st.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* 11 Questionnaire Categories */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              11 Questionnaire Sections
            </div>
            <button
              type="button"
              onClick={() => setSelectedSection('all')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedSection === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>All 11 Sections</span>
              <span className="text-[10px] font-mono text-slate-400">Q1–Q72</span>
            </button>

            {CODEX_QUESTIONNAIRE_SECTIONS.map((sec) => {
              const active = selectedSection === sec.sectionNumber;
              return (
                <button
                  key={sec.sectionNumber}
                  type="button"
                  onClick={() => setSelectedSection(sec.sectionNumber)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className="truncate pr-2">{sec.title}</span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {sec.questionRange}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area: Cards or Raw .TXT Preview */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {viewMode === 'raw_txt' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-300">
                  Showing canonical text-file format (`RULE ID`, `STATUS`, `APPLIES TO`, `PLAY STYLE`, `COMBAT MODE`, `RULE`, `DOES NOT ALLOW`, `CHECK`, `EXAMPLE`, `OPEN QUESTIONS`) for{' '}
                  <strong className="text-white">{filteredRules.length}</strong> rules:
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(fullFormattedText, 'raw_view')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  {copiedId === 'raw_view' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Shown Text</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 whitespace-pre-wrap leading-relaxed select-text overflow-x-auto">
                {fullFormattedText}
              </pre>
            </div>
          ) : (
            <>
              {filteredRules.map((item) => {
                const isEditing = editingQNum === item.questionNumber;
                const singleTxt = formatSingleRuleAsCodexText(item);

                return (
                  <div
                    key={item.questionNumber}
                    className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3"
                  >
                    {/* Question & Quick Action Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                          <span className="text-amber-400 font-bold">
                            QUESTION {item.questionNumber}
                          </span>
                          <span>·</span>
                          <span>{item.sectionTitle}</span>
                          <span>·</span>
                          <span className="text-sky-300 font-bold">{item.ruleId}</span>
                          <span>·</span>
                          <span
                            className={
                              item.status === 'CONFIRMED'
                                ? 'text-emerald-400 font-bold'
                                : item.status === 'SUPERSEDED'
                                ? 'text-rose-400 font-bold'
                                : 'text-amber-300 font-bold'
                            }
                          >
                            STATUS: {item.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug">
                          Q{item.questionNumber}. {item.questionText}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(singleTxt, `rule_${item.questionNumber}`)
                          }
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
                          title="Copy this rule in canonical text-file format"
                        >
                          {copiedId === `rule_${item.questionNumber}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-300">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Rule</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setEditingQNum(isEditing ? null : item.questionNumber)
                          }
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                            isEditing
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-300'
                          }`}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isEditing ? 'Done Editing' : 'Edit Answer'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Decision Answer Bar (Yes / No / Depends / Undecided / Custom Rule) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[11px] font-mono uppercase text-slate-400">
                        Answer:
                      </span>
                      {(
                        ['Yes', 'No', 'Depends', 'Undecided', 'Custom Rule'] as RuleDecisionAnswer[]
                      ).map((ans) => (
                        <button
                          key={ans}
                          type="button"
                          onClick={() => {
                            const nextStatus: RuleStatus =
                              ans === 'Undecided' ? 'UNDECIDED' : item.status;
                            handleUpdateRule(item.questionNumber, {
                              decision: ans,
                              status: nextStatus,
                            });
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                            item.decision === ans
                              ? 'bg-amber-500/25 text-amber-200 border border-amber-400/60'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {ans}
                        </button>
                      ))}

                      {item.decision === 'Depends' && item.dependsOn && !isEditing && (
                        <span className="text-xs text-amber-300 font-medium">
                          — {item.dependsOn}
                        </span>
                      )}
                    </div>

                    {/* Interactive Editor Mode */}
                    {isEditing ? (
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/40 space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                              RULE ID
                            </label>
                            <input
                              type="text"
                              value={item.ruleId}
                              onChange={(e) =>
                                handleUpdateRule(item.questionNumber, {
                                  ruleId: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                              RULE NAME
                            </label>
                            <input
                              type="text"
                              value={item.ruleName}
                              onChange={(e) =>
                                handleUpdateRule(item.questionNumber, {
                                  ruleName: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                              STATUS
                            </label>
                            <select
                              value={item.status}
                              onChange={(e) =>
                                handleUpdateRule(item.questionNumber, {
                                  status: e.target.value as RuleStatus,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white font-mono text-xs"
                            >
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="UNDECIDED">UNDECIDED</option>
                              <option value="SUPERSEDED">SUPERSEDED</option>
                            </select>
                          </div>
                        </div>

                        {item.decision === 'Depends' && (
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-amber-300 mb-1">
                              WHAT IT DEPENDS ON
                            </label>
                            <input
                              type="text"
                              value={item.dependsOn || ''}
                              onChange={(e) =>
                                handleUpdateRule(item.questionNumber, {
                                  dependsOn: e.target.value,
                                })
                              }
                              placeholder="Say what this rule depends on..."
                              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-amber-500/50 text-white text-xs"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                              APPLIES TO
                            </label>
                            <input
                              type="text"
                              value={item.appliesTo}
                              onChange={(e) =>
                                handleUpdateRule(item.questionNumber, {
                                  appliesTo: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                              PLAY STYLE
                            </label>
                            <input
                              type="text"
                              value={item.playStyle}
                              onChange={(e) =>
                                handleUpdateRule(item.questionNumber, {
                                  playStyle: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                              COMBAT MODE
                            </label>
                            <input
                              type="text"
                              value={item.combatMode}
                              onChange={(e) =>
                                handleUpdateRule(item.questionNumber, {
                                  combatMode: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                            RULE (What a player is allowed to do &amp; what happens when rules meet)
                          </label>
                          <textarea
                            rows={3}
                            value={item.rule}
                            onChange={(e) =>
                              handleUpdateRule(item.questionNumber, {
                                rule: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                            DOES NOT ALLOW (One forbidden item per line)
                          </label>
                          <textarea
                            rows={2}
                            value={item.doesNotAllow.join('\n')}
                            onChange={(e) =>
                              handleUpdateRule(item.questionNumber, {
                                doesNotAllow: e.target.value
                                  .split('\n')
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                              CHECK
                            </label>
                            <input
                              type="text"
                              value={item.check}
                              onChange={(e) =>
                                handleUpdateRule(item.questionNumber, {
                                  check: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                              OPEN QUESTIONS
                            </label>
                            <input
                              type="text"
                              value={item.openQuestions}
                              onChange={(e) =>
                                handleUpdateRule(item.questionNumber, {
                                  openQuestions: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                            EXAMPLE
                          </label>
                          <textarea
                            rows={2}
                            value={item.example}
                            onChange={(e) =>
                              handleUpdateRule(item.questionNumber, {
                                example: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Canonical Structured Codex Display */
                      <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/90 font-mono text-[11px] space-y-2.5 leading-relaxed">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-slate-300 border-b border-slate-800 pb-2">
                          <div>
                            <span className="text-slate-500">RULE ID: </span>
                            <strong className="text-amber-300">{item.ruleId}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">RULE NAME: </span>
                            <strong className="text-white">{item.ruleName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">STATUS: </span>
                            <strong
                              className={
                                item.status === 'CONFIRMED'
                                  ? 'text-emerald-400'
                                  : item.status === 'SUPERSEDED'
                                  ? 'text-rose-400'
                                  : 'text-amber-300'
                              }
                            >
                              {item.status}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500">APPLIES TO: </span>
                            <span className="text-sky-200">{item.appliesTo}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">PLAY STYLE: </span>
                            <span className="text-purple-200">{item.playStyle}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">COMBAT MODE: </span>
                            <span className="text-amber-200">{item.combatMode}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-400 font-bold">RULE:</div>
                          <div className="text-slate-100 font-sans text-xs mt-0.5">
                            {item.rule}
                          </div>
                        </div>

                        <div>
                          <div className="text-rose-300/90 font-bold">DOES NOT ALLOW:</div>
                          <ul className="list-disc list-inside text-slate-200 font-sans text-xs space-y-0.5 mt-0.5">
                            {item.doesNotAllow.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div>
                            <div className="text-emerald-300 font-bold">CHECK:</div>
                            <div className="text-slate-200 font-sans text-xs mt-0.5">
                              {item.check}
                            </div>
                          </div>
                          <div>
                            <div className="text-sky-300 font-bold">EXAMPLE:</div>
                            <div className="text-slate-200 font-sans text-xs mt-0.5">
                              {item.example}
                            </div>
                          </div>
                        </div>

                        {item.supersededPriorWording && (
                          <div className="p-2.5 rounded-lg bg-rose-950/25 border border-rose-500/30 text-rose-200/90 font-sans text-[11px]">
                            <strong className="font-mono uppercase text-[10px] text-rose-300 block mb-0.5">
                              Superseded Prior Wording (Design Traceability):
                            </strong>
                            {item.supersededPriorWording}
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/70">
                          <span className="text-slate-500 font-bold">OPEN QUESTIONS: </span>
                          <span>{item.openQuestions || 'None.'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
