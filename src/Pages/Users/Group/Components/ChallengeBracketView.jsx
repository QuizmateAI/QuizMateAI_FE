import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Crown, Loader2, Trophy, UserRound, Zap } from 'lucide-react';
import { getChallengeBracket } from '@/api/ChallengeAPI';

const BRACKET_SIZES = [4, 8, 16, 32, 64];
const NODE_WIDTH = 248;
const NODE_HEIGHT = 54;
const NODE_GAP = 14;
const ROUND_GAP = 96;
const LABEL_HEIGHT = 32;
const CANVAS_PADDING = 16;

function readPositiveNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function nextPowerOfTwo(value) {
  const normalized = Math.max(2, Number(value) || 2);
  return 2 ** Math.ceil(Math.log2(normalized));
}

function resolveBracketSize(data, participants, configuredBracketSize) {
  const firstRoundSize = Array.isArray(data?.rounds?.[0]?.matches)
    ? data.rounds[0].matches.length * 2
    : null;
  const resolved = readPositiveNumber(
    data?.bracketSize,
    data?.slotCount,
    data?.capacityLimit,
    configuredBracketSize,
    firstRoundSize,
  );
  if (resolved) return nextPowerOfTwo(resolved);
  return BRACKET_SIZES.find((size) => size >= Math.max(4, participants.length)) || nextPowerOfTwo(participants.length);
}

function getRoundLabel(roundNumber, totalRounds) {
  if (totalRounds <= 1 || roundNumber === totalRounds) return 'Chung kết';
  if (roundNumber === totalRounds - 1) return 'Bán kết';
  if (roundNumber === totalRounds - 2) return 'Tứ kết';
  return `Vòng ${roundNumber}`;
}

function getChallengeStatusLabel(status) {
  switch (String(status || '').toUpperCase()) {
    case 'SCHEDULED':
      return 'Sắp diễn ra';
    case 'LIVE':
      return 'Đang diễn ra';
    case 'FINISHED':
      return 'Đã kết thúc';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status || 'Chưa rõ';
  }
}

function getPersonName(person) {
  return person?.fullName || person?.displayName || person?.username || person?.email || person?.name || 'Thành viên';
}

function normalizePerson(person, fallbackSeed) {
  if (!person) return null;
  const seed = readPositiveNumber(
    person.seed,
    person.bracketSeed,
    person.slotNumber,
    person.slot,
    person.rank,
    fallbackSeed,
  );
  return {
    participantId: readPositiveNumber(person.participantId, person.challengeParticipantId, person.id),
    userId: readPositiveNumber(person.userId, person.memberUserId),
    seed,
    fullName: getPersonName(person),
    username: person.username || '',
    email: person.email || '',
    avatar: person.avatar || person.avatarUrl || '',
    score: person.score,
    status: person.participantStatus || person.status || '',
    raw: person,
  };
}

function collectSeedSources(data, participants) {
  const firstRoundPlayers = Array.isArray(data?.rounds?.[0]?.matches)
    ? data.rounds[0].matches.flatMap((match) => [match.player1, match.player2]).filter(Boolean)
    : [];
  const apiSlots = Array.isArray(data?.slots) ? data.slots : [];
  const apiParticipants = Array.isArray(data?.participants) ? data.participants : [];
  return firstRoundPlayers.length > 0
    ? firstRoundPlayers
    : [...apiSlots, ...apiParticipants, ...participants];
}

function buildSeededSlots(data, participants, bracketSize) {
  const slots = Array.from({ length: bracketSize }, (_, index) => ({
    slotNumber: index + 1,
    participant: null,
  }));
  const sources = collectSeedSources(data, participants)
    .map((person, index) => normalizePerson(person, index + 1))
    .filter(Boolean);
  const usedKeys = new Set();

  sources.forEach((person) => {
    const key = person.participantId || person.userId || `${person.fullName}:${person.seed}`;
    if (usedKeys.has(key)) return;
    const targetIndex = person.seed && person.seed <= bracketSize
      ? person.seed - 1
      : slots.findIndex((slot) => !slot.participant);
    if (targetIndex < 0 || slots[targetIndex]?.participant) return;
    slots[targetIndex] = {
      slotNumber: targetIndex + 1,
      participant: person,
    };
    usedKeys.add(key);
  });

  return slots;
}

function getMatchWinner(match) {
  const winnerId = readPositiveNumber(match?.winnerParticipantId);
  if (!winnerId) return null;
  const candidates = [match?.player1, match?.player2].filter(Boolean);
  return candidates.find((player) => readPositiveNumber(player.participantId) === winnerId) || null;
}

function getRoundMatches(data, roundNumber) {
  const rounds = Array.isArray(data?.rounds) ? data.rounds : [];
  const fallback = rounds[roundNumber - 1];
  return rounds.find((round) => Number(round.round) === roundNumber || Number(round.roundNumber) === roundNumber) || fallback || null;
}

function buildBracketLayout({ data, slots, bracketSize }) {
  const totalRounds = Math.max(1, Math.ceil(Math.log2(bracketSize)));
  const slotPitch = NODE_HEIGHT + NODE_GAP;
  const roundPitch = NODE_WIDTH + ROUND_GAP;
  const columns = [];

  columns[0] = slots.map((slot, index) => ({
    kind: 'slot',
    key: `slot-${slot.slotNumber}`,
    slot,
    x: CANVAS_PADDING,
    y: LABEL_HEIGHT + CANVAS_PADDING + index * slotPitch,
  }));

  for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
    const previousColumn = columns[roundNumber - 1];
    const roundInfo = getRoundMatches(data, roundNumber);
    const matches = Array.isArray(roundInfo?.matches) ? roundInfo.matches : [];
    const nodeCount = Math.max(1, Math.ceil(previousColumn.length / 2));
    columns[roundNumber] = Array.from({ length: nodeCount }, (_, matchIndex) => {
      const childA = previousColumn[matchIndex * 2];
      const childB = previousColumn[matchIndex * 2 + 1] || childA;
      const match = matches[matchIndex] || null;
      const winner = getMatchWinner(match);
      return {
        kind: 'match',
        key: `round-${roundNumber}-match-${matchIndex}`,
        roundNumber,
        roundLabel: roundInfo?.roundLabel || getRoundLabel(roundNumber, totalRounds),
        match,
        matchIndex,
        winner: winner ? normalizePerson(winner, matchIndex + 1) : null,
        x: CANVAS_PADDING + roundNumber * roundPitch,
        y: (childA.y + childB.y) / 2,
      };
    });
  }

  const lastColumn = columns[columns.length - 1];
  const finalNode = lastColumn[0];
  const championName = data?.championFullName || data?.championUsername || '';
  const championNode = {
    kind: 'champion',
    key: 'champion',
    x: finalNode.x + roundPitch,
    y: finalNode.y,
    name: championName,
  };
  columns.push([championNode]);

  const lines = [];
  for (let columnIndex = 1; columnIndex < columns.length; columnIndex += 1) {
    const currentColumn = columns[columnIndex];
    const previousColumn = columns[columnIndex - 1];
    currentColumn.forEach((node, index) => {
      if (node.kind === 'champion') {
        const source = previousColumn[0];
        if (!source) return;
        const startX = source.x + NODE_WIDTH;
        const startY = source.y + NODE_HEIGHT / 2;
        const endX = node.x;
        const endY = node.y + NODE_HEIGHT / 2;
        lines.push({ key: `${source.key}-${node.key}`, startX, startY, midX: startX + ROUND_GAP / 2, endX, endY });
        return;
      }

      const childA = previousColumn[index * 2];
      const childB = previousColumn[index * 2 + 1] || childA;
      if (!childA || !childB) return;
      const startX = childA.x + NODE_WIDTH;
      const startY = childA.y + NODE_HEIGHT / 2;
      const secondY = childB.y + NODE_HEIGHT / 2;
      const endX = node.x;
      const endY = node.y + NODE_HEIGHT / 2;
      lines.push({
        key: `${childA.key}-${childB.key}-${node.key}`,
        startX,
        startY,
        secondY,
        midX: startX + ROUND_GAP / 2,
        endX,
        endY,
      });
    });
  }

  const flatNodes = columns.flat();
  const width = Math.max(...flatNodes.map((node) => node.x)) + NODE_WIDTH + CANVAS_PADDING;
  const height = Math.max(...flatNodes.map((node) => node.y)) + NODE_HEIGHT + CANVAS_PADDING;

  return { columns, nodes: flatNodes, lines, width, height, totalRounds };
}

function statusBadge(status, isDarkMode) {
  const base = 'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider';
  switch (status) {
    case 'SCHEDULED':
      return `${base} ${isDarkMode ? 'bg-sky-500/20 text-sky-200' : 'bg-sky-100 text-sky-700'}`;
    case 'LIVE':
      return `${base} ${isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}`;
    case 'BLITZ_TIEBREAK':
      return `${base} ${isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-700'}`;
    case 'FINISHED':
      return `${base} ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`;
    case 'BYE':
      return `${base} ${isDarkMode ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'}`;
    default:
      return `${base} ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`;
  }
}

function PersonAvatar({ person, isDarkMode }) {
  const initial = String(person?.fullName || person?.username || '?').trim().charAt(0).toUpperCase() || '?';
  if (person?.avatar) {
    return <img src={person.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
      isDarkMode ? 'bg-teal-500/20 text-teal-100' : 'bg-teal-100 text-teal-700'
    }`}>
      {initial}
    </div>
  );
}

function SlotNode({ node, isDarkMode }) {
  const participant = node.slot.participant;
  return (
    <div
      className={`absolute flex h-[54px] w-[248px] items-center gap-3 rounded-lg border px-3 shadow-sm ${
        participant
          ? (isDarkMode ? 'border-teal-500/30 bg-slate-900 text-slate-100' : 'border-teal-100 bg-white text-slate-900')
          : (isDarkMode ? 'border-slate-700 bg-slate-900/70 text-slate-500' : 'border-dashed border-gray-300 bg-gray-50 text-gray-400')
      }`}
      style={{ left: node.x, top: node.y }}
    >
      <div className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
        participant
          ? (isDarkMode ? 'bg-teal-500/20 text-teal-100' : 'bg-teal-50 text-teal-700')
          : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-white text-gray-400')
      }`}>
        #{node.slot.slotNumber}
      </div>
      {participant ? <PersonAvatar person={participant} isDarkMode={isDarkMode} /> : <UserRound className="h-7 w-7 shrink-0 opacity-50" />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {participant ? participant.fullName : 'Slot trống'}
        </div>
        <div className={`truncate text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          {participant?.username ? `@${participant.username}` : participant ? 'Đã đăng ký' : 'Chờ người tham gia'}
        </div>
      </div>
    </div>
  );
}

function MatchNode({ node, isDarkMode }) {
  const status = String(node.match?.status || '').toUpperCase();
  const winner = node.winner;
  const pendingLabel = node.roundNumber === 1
    ? `Cặp đấu vòng 1 #${node.matchIndex + 1}`
    : `Chờ người thắng từ vòng ${node.roundNumber - 1}`;
  return (
    <div
      className={`absolute flex h-[54px] w-[248px] items-center gap-3 rounded-lg border px-3 shadow-sm ${
        winner
          ? (isDarkMode ? 'border-amber-500/30 bg-slate-900 text-slate-100' : 'border-amber-100 bg-white text-slate-900')
          : (isDarkMode ? 'border-slate-700 bg-slate-900/75 text-slate-400' : 'border-gray-200 bg-white text-gray-500')
      }`}
      style={{ left: node.x, top: node.y }}
    >
      <div className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
        winner
          ? (isDarkMode ? 'bg-amber-500/20 text-amber-100' : 'bg-amber-50 text-amber-700')
          : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500')
      }`}>
        {node.roundNumber === 1 ? 'R1' : `R${node.roundNumber}`}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {winner ? winner.fullName : pendingLabel}
        </div>
        <div className={`truncate text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          {winner ? `${node.roundLabel} · Người thắng` : `${node.roundLabel} · Sẽ đấu tại vòng này`}
        </div>
      </div>
      {status ? (
        <span className={statusBadge(status, isDarkMode)}>
          {status === 'BLITZ_TIEBREAK' ? 'BLITZ' : status}
        </span>
      ) : null}
    </div>
  );
}

function ChampionNode({ node, isDarkMode }) {
  return (
    <div
      className={`absolute flex h-[54px] w-[248px] items-center gap-3 rounded-lg border px-3 shadow-md ${
        node.name
          ? (isDarkMode ? 'border-amber-400/50 bg-amber-500/15 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900')
          : (isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-400' : 'border-gray-200 bg-white text-gray-500')
      }`}
      style={{ left: node.x, top: node.y }}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
        node.name
          ? (isDarkMode ? 'bg-amber-400 text-slate-950' : 'bg-amber-500 text-white')
          : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500')
      }`}>
        <Crown className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{node.name || 'Chưa có vô địch'}</div>
        <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Champion</div>
      </div>
    </div>
  );
}

function TreeColumnHeaders({ layout, isDarkMode }) {
  return (
    <>
      {layout.columns.map((column, index) => {
        const firstNode = column[0];
        if (!firstNode) return null;

        const label = index === 0
          ? 'SLOT'
          : index === layout.columns.length - 1
            ? 'VÔ ĐỊCH'
            : getRoundLabel(index, layout.totalRounds).toUpperCase();

        return (
          <div
            key={`tree-header-${index}`}
            className={`absolute top-3 flex h-5 items-center justify-center text-[11px] font-bold uppercase tracking-normal ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
            style={{ left: firstNode.x, width: NODE_WIDTH }}
          >
            {label}
          </div>
        );
      })}
    </>
  );
}

function SlotRow({ slot, isDarkMode }) {
  const participant = slot.participant;
  return (
    <div className={`flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 ${
      participant
        ? (isDarkMode ? 'border-teal-500/25 bg-slate-900/75 text-slate-100' : 'border-teal-100 bg-white text-slate-900')
        : (isDarkMode ? 'border-dashed border-slate-700 bg-slate-900/45 text-slate-500' : 'border-dashed border-gray-300 bg-gray-50 text-gray-400')
    }`}>
      <div className={`flex h-8 w-10 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
        participant
          ? (isDarkMode ? 'bg-teal-500/20 text-teal-100' : 'bg-teal-50 text-teal-700')
          : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-white text-gray-400')
      }`}>
        #{slot.slotNumber}
      </div>
      {participant ? <PersonAvatar person={participant} isDarkMode={isDarkMode} /> : <UserRound className="h-7 w-7 shrink-0 opacity-50" />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {participant ? participant.fullName : 'Slot trống'}
        </div>
        <div className={`truncate text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          {participant?.username ? `@${participant.username}` : participant ? 'Đã đăng ký' : 'Chờ người tham gia'}
        </div>
      </div>
    </div>
  );
}

function MatchSlotCard({ pair, matchIndex, isDarkMode }) {
  const filledCount = pair.filter((slot) => Boolean(slot?.participant)).length;
  return (
    <div className={`rounded-xl border p-3 ${
      isDarkMode ? 'border-slate-700 bg-slate-900/45' : 'border-gray-200 bg-white'
    }`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Match #{matchIndex + 1}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          filledCount === 2
            ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700')
            : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500')
        }`}>
          {filledCount}/2 slot
        </span>
      </div>
      <div className="space-y-2">
        {pair.map((slot) => (
          <SlotRow key={slot.slotNumber} slot={slot} isDarkMode={isDarkMode} />
        ))}
      </div>
    </div>
  );
}

function RoundMiniCard({ column, roundIndex, totalRounds, isDarkMode }) {
  const nodes = column.filter((node) => node.kind === 'match');
  const doneCount = nodes.filter((node) => Boolean(node.winner)).length;
  return (
    <div className={`rounded-xl border p-3 ${
      isDarkMode ? 'border-slate-700 bg-slate-900/45' : 'border-gray-200 bg-white'
    }`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {getRoundLabel(roundIndex, totalRounds)}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          doneCount === nodes.length && nodes.length > 0
            ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700')
            : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500')
        }`}>
          {doneCount}/{nodes.length}
        </span>
      </div>
      <div className="space-y-2">
        {nodes.map((node) => (
          <div key={node.key} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs ${
            node.winner
              ? (isDarkMode ? 'bg-amber-500/10 text-amber-100' : 'bg-amber-50 text-amber-900')
              : (isDarkMode ? 'bg-slate-800/60 text-slate-400' : 'bg-gray-50 text-gray-500')
          }`}>
            <span className="shrink-0 font-semibold">Match #{node.matchIndex + 1}</span>
            <span className="min-w-0 truncate text-right">
              {node.winner?.fullName || (roundIndex === 1 ? 'Sẽ đấu ở vòng 1' : `Chờ thắng vòng ${roundIndex - 1}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactBracketView({ slots, layout, isDarkMode }) {
  const slotPairs = [];
  for (let index = 0; index < slots.length; index += 2) {
    slotPairs.push(slots.slice(index, index + 2));
  }

  const roundColumns = layout.columns.slice(1, -1);

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <div className={`mb-3 text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Cặp đấu vòng 1
        </div>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {slotPairs.map((pair, index) => (
            <MatchSlotCard
              key={`pair-${index}`}
              pair={pair}
              matchIndex={index}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </div>

      <div>
        <div className={`mb-3 text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Nhánh đi tiếp
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roundColumns.map((column, index) => (
            <RoundMiniCard
              key={`round-mini-${index}`}
              column={column}
              roundIndex={index + 1}
              totalRounds={layout.totalRounds}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChallengeBracketView({
  workspaceId,
  eventId,
  isDarkMode,
  participants = [],
  bracketSize = null,
  challengeStatus = 'SCHEDULED',
  published = false,
}) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('compact');
  const { data, isLoading } = useQuery({
    queryKey: ['challenge-bracket', workspaceId, eventId],
    queryFn: async () => (await getChallengeBracket(workspaceId, eventId))?.data ?? null,
    enabled: Boolean(workspaceId && eventId),
    refetchInterval: 5000,
    retry: false,
  });

  const effectiveData = data || {};
  const normalizedParticipants = Array.isArray(participants) ? participants : [];
  const resolvedBracketSize = resolveBracketSize(effectiveData, normalizedParticipants, bracketSize);
  const slots = useMemo(
    () => buildSeededSlots(effectiveData, normalizedParticipants, resolvedBracketSize),
    [effectiveData, normalizedParticipants, resolvedBracketSize],
  );
  const layout = useMemo(
    () => buildBracketLayout({ data: effectiveData, slots, bracketSize: resolvedBracketSize }),
    [effectiveData, slots, resolvedBracketSize],
  );
  const registeredCount = slots.filter((slot) => Boolean(slot.participant)).length;
  const champion = effectiveData.championParticipantId
    ? { id: effectiveData.championParticipantId, name: effectiveData.championFullName || effectiveData.championUsername }
    : null;

  if (isLoading && registeredCount === 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border ${
      isDarkMode ? 'border-slate-700 bg-slate-950/70' : 'border-gray-200 bg-white'
    }`}>
      <div className={`flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 ${
        isDarkMode ? 'border-slate-800' : 'border-gray-100'
      }`}>
        <div>
          <div className={`flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <Trophy className={`h-4 w-4 ${isDarkMode ? 'text-orange-300' : 'text-orange-500'}`} />
            Sơ đồ slot đấu cúp
          </div>
          <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {registeredCount}/{resolvedBracketSize} slot đã có người đăng ký. {published ? 'Challenge đã publish.' : 'Đề và slot vẫn bị ẩn với member trước khi publish và trước giờ làm bài.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> : null}
          <span className={statusBadge(challengeStatus, isDarkMode)}>
            {getChallengeStatusLabel(challengeStatus)}
          </span>
          <div className={`flex rounded-lg p-0.5 ${
            isDarkMode ? 'bg-slate-900' : 'bg-gray-100'
          }`}>
            {[
              { key: 'compact', label: 'Cặp đấu' },
              { key: 'tree', label: 'Sơ đồ cây' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setViewMode(option.key)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  viewMode === option.key
                    ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm')
                    : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {champion ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isDarkMode ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-50 text-amber-700'
            }`}>
              <Crown className="h-3.5 w-3.5" />
              {t('challengeBracket.championLabel', { name: champion.name, defaultValue: 'Vô địch: {{name}}' })}
            </span>
          ) : null}
        </div>
      </div>

      {viewMode === 'compact' ? (
        <CompactBracketView slots={slots} layout={layout} isDarkMode={isDarkMode} />
      ) : (
        <div className="overflow-x-auto">
          <div className="relative" style={{ width: layout.width, height: layout.height }}>
            <TreeColumnHeaders layout={layout} isDarkMode={isDarkMode} />
            <svg
              width={layout.width}
              height={layout.height}
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              {layout.lines.map((line) => (
                <g key={line.key}>
                  {line.secondY != null ? (
                    <path
                      d={`M ${line.startX} ${line.startY} H ${line.midX} M ${line.startX} ${line.secondY} H ${line.midX} M ${line.midX} ${line.startY} V ${line.secondY} M ${line.midX} ${line.endY} H ${line.endX}`}
                      stroke={isDarkMode ? '#475569' : '#cbd5e1'}
                      strokeWidth="2"
                      fill="none"
                    />
                  ) : (
                    <path
                      d={`M ${line.startX} ${line.startY} H ${line.midX} V ${line.endY} H ${line.endX}`}
                      stroke={isDarkMode ? '#f59e0b' : '#f97316'}
                      strokeWidth="2"
                      fill="none"
                    />
                  )}
                </g>
              ))}
            </svg>

            {layout.nodes.map((node) => {
              if (node.kind === 'slot') return <SlotNode key={node.key} node={node} isDarkMode={isDarkMode} />;
              if (node.kind === 'champion') return <ChampionNode key={node.key} node={node} isDarkMode={isDarkMode} />;
              return <MatchNode key={node.key} node={node} isDarkMode={isDarkMode} />;
            })}
          </div>
        </div>
      )}

      <div className={`flex flex-wrap items-center gap-3 border-t px-4 py-3 text-xs ${
        isDarkMode ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-500'
      }`}>
        <span className="inline-flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-orange-500" />
          Slot trống sẽ được lấp khi member đăng ký hoặc nhận lời mời.
        </span>
        <span>BYE chỉ được tính khi bracket chính thức bắt đầu.</span>
      </div>
    </div>
  );
}
