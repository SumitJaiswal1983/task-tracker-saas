import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadow, radius } from '../theme';
import { api } from '../api';

function StatCard({ icon, label, value, sub, color, bgColor, onPress }) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={[s.statCard, shadow.sm]} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.statIcon, { backgroundColor: bgColor }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </Container>
  );
}

function ProgressBar({ pct, color = colors.primary }) {
  return (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }]} />
    </View>
  );
}

export default function DashboardScreen({ currentUser, sheetName, onNavigateToTasks }) {
  const [stats, setStats] = useState(null);
  const [weeklyScores, setWeeklyScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, w] = await Promise.all([
        api.getDashboard({ sheet_name: sheetName }),
        api.getWeeklyScores(),
      ]);
      setStats(s);
      setWeeklyScores(w);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sheetName]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!stats) return null;

  const completionPct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={s.pageHeader}>
          <View>
            <Text style={s.pageTitle}>Dashboard</Text>
            <Text style={s.pageSub}>{sheetName} · {today}</Text>
          </View>
          <View style={s.completionBadge}>
            <Text style={s.completionText}>{completionPct}% Done</Text>
          </View>
        </View>

        {/* Stat Cards */}
        <View style={s.statGrid}>
          <StatCard icon="📋" label="Total" value={stats.total} color={colors.blue} bgColor={colors.blueLight} onPress={() => onNavigateToTasks?.({ status: '', stakeholder: '' })} />
          <StatCard icon="✅" label="Completed" value={stats.completed} sub={`${completionPct}%`} color={colors.green} bgColor={colors.greenLight} onPress={() => onNavigateToTasks?.({ status: 'Completed', stakeholder: '' })} />
          <StatCard icon="⏳" label="Pending" value={stats.pending} color={colors.orange} bgColor={colors.orangeLight} onPress={() => onNavigateToTasks?.({ status: 'Pending', stakeholder: '' })} />
          <StatCard icon="🔴" label="Overdue" value={stats.overdue} sub={stats.overdue > 0 ? 'Action needed' : 'On track'} color={colors.red} bgColor={colors.redLight} onPress={() => onNavigateToTasks?.({ status: 'Overdue', stakeholder: '' })} />
          <StatCard icon="⭐" label="Avg Score" value={stats.avgScore || '—'} sub="out of 5.0" color={colors.purple} bgColor={colors.purpleLight} />
        </View>

        {/* Progress */}
        <View style={[s.card, { marginBottom: 16 }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Overall Completion</Text>
            <Text style={[s.cardBadge, { color: colors.primary }]}>{completionPct}%</Text>
          </View>
          <View style={s.cardBody}>
            <ProgressBar pct={completionPct} />
            <View style={s.progressLabels}>
              <Text style={s.progressLabel}>✅ {stats.completed} completed</Text>
              <Text style={s.progressLabel}>⏳ {stats.pending} remaining</Text>
            </View>
          </View>
        </View>

        {/* Stakeholder Performance */}
        {stats.stakeholderStats?.length > 0 && (
          <View style={[s.card, { marginBottom: 16 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>👥 Stakeholder Performance</Text>
            </View>
            {stats.stakeholderStats.map((st, i) => (
              <View key={st.name} style={[s.tableRow, i === stats.stakeholderStats.length - 1 && { borderBottomWidth: 0 }]}>
                <TouchableOpacity onPress={() => onNavigateToTasks?.({ stakeholder: st.name, status: '' })} style={{ flex: 1 }}>
                  <Text style={[s.rowName, { color: colors.primary }]} numberOfLines={1}>{st.name}</Text>
                </TouchableOpacity>
                <View style={s.rowStats}>
                  <Text style={s.rowStatNum}>{st.total}</Text>
                  <TouchableOpacity onPress={() => onNavigateToTasks?.({ stakeholder: st.name, status: 'Completed' })}>
                    <Text style={[s.rowStatNum, { color: colors.success }]}>{st.completed}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => st.pending > 0 && onNavigateToTasks?.({ stakeholder: st.name, status: 'Pending' })}>
                    <Text style={[s.rowStatNum, { color: st.pending > 0 ? colors.warning : colors.textMuted }]}>{st.pending}</Text>
                  </TouchableOpacity>
                  <Text style={[s.rowScore, {
                    color: st.avgScore === '-' ? '#ccc' : st.avgScore >= 4 ? colors.success : st.avgScore >= 3 ? colors.warning : colors.danger
                  }]}>
                    {st.avgScore === '-' ? '—' : `${st.avgScore}/5`}
                  </Text>
                </View>
              </View>
            ))}
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHLabel, { flex: 1 }]}>Person</Text>
              <View style={s.rowStats}>
                <Text style={s.tableHLabel}>Total</Text>
                <Text style={s.tableHLabel}>Done</Text>
                <Text style={s.tableHLabel}>Pend</Text>
                <Text style={s.tableHLabel}>Score</Text>
              </View>
            </View>
          </View>
        )}

        {/* Section Breakdown */}
        {stats.sectionStats?.length > 0 && (
          <View style={[s.card, { marginBottom: 16 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>🏢 Section Breakdown</Text>
            </View>
            {stats.sectionStats.map((sec, i) => {
              const pct = Math.round((sec.completed / sec.total) * 100);
              return (
                <View key={sec.name} style={[s.sectionRow, i === stats.sectionStats.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={s.sectionTop}>
                    <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>{sec.name}</Text></View>
                    <Text style={s.sectionPct}>{pct}%</Text>
                  </View>
                  <ProgressBar pct={pct} />
                  <Text style={s.sectionSub}>{sec.completed}/{sec.total} tasks done</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Weekly Scores */}
        {weeklyScores.length > 0 && (
          <View style={[s.card, { marginBottom: 24 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>📈 Weekly Scores</Text>
            </View>
            <View style={s.cardBody}>
              {weeklyScores.map(w => {
                const pct = Math.max(0, Math.min(100, parseFloat(w.score_percent) || 0));
                const barColor = pct >= 80 ? colors.success : pct >= 60 ? colors.warning : colors.danger;
                return (
                  <View key={w.id} style={s.weekRow}>
                    <Text style={s.weekLabel} numberOfLines={1}>{w.week_number}</Text>
                    <View style={s.weekBarWrap}>
                      <View style={[s.weekBar, { width: `${pct}%`, backgroundColor: barColor }]} />
                    </View>
                    <Text style={[s.weekScore, { color: barColor }]}>{pct.toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  pageSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  completionBadge: { backgroundColor: colors.successLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  completionText: { fontSize: 12, fontWeight: '700', color: colors.success },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  statIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  statSub: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardBadge: { fontSize: 15, fontWeight: '800' },
  cardBody: { padding: 14 },

  progressTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabel: { fontSize: 11, color: colors.textMuted },

  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f9fafb', borderTopWidth: 1, borderTopColor: colors.border },
  tableHLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', width: 44, textAlign: 'center' },
  rowName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  rowStats: { flexDirection: 'row', gap: 4 },
  rowStatNum: { width: 44, textAlign: 'center', fontSize: 13, fontWeight: '600', color: colors.textMuted },
  rowScore: { width: 44, textAlign: 'center', fontSize: 13, fontWeight: '700' },

  sectionRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  sectionBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  sectionPct: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  sectionSub: { fontSize: 11, color: colors.textMuted, marginTop: 6 },

  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  weekLabel: { width: 70, fontSize: 12, color: colors.textMuted },
  weekBarWrap: { flex: 1, height: 18, backgroundColor: '#e5e7eb', borderRadius: 99, overflow: 'hidden' },
  weekBar: { height: '100%', borderRadius: 99 },
  weekScore: { width: 40, textAlign: 'right', fontSize: 12, fontWeight: '700' },
});
