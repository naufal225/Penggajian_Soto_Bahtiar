import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import SkeletonBlock from '@/components/ui/skeleton-block';
import { clearAuthToken } from '@/services/storage/session-storage';
import type { EmployeeItem, EmployeeStatusFilter } from '@/types/employee';
import { useEmployeeListViewModel } from '@/viewmodels/useEmployeeListViewModel';

const FILTER_OPTIONS: Array<{ label: string; value: EmployeeStatusFilter }> = [
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
  { label: 'Semua', value: 'all' },
];

function statusLabel(isActive: boolean): string {
  return isActive ? 'Aktif' : 'Nonaktif';
}

function statusBadgeStyle(isActive: boolean) {
  return isActive ? styles.activeBadge : styles.inactiveBadge;
}

function statusBadgeTextStyle(isActive: boolean) {
  return isActive ? styles.activeBadgeText : styles.inactiveBadgeText;
}

export default function EmployeeListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handleUnauthorized = useCallback(() => {
    void clearAuthToken();
    router.replace('/login');
  }, [router]);

  const viewModel = useEmployeeListViewModel({
    onUnauthorized: handleUnauthorized,
  });

  useFocusEffect(
    useCallback(() => {
      viewModel.refreshData();
    }, [viewModel.refreshData])
  );

  const header = useMemo(
    () => (
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Data Karyawan</Text>
          <Pressable style={styles.addButton} onPress={() => router.push('/employees/create')}>
            <Text style={styles.addButtonText}>Tambah</Text>
          </Pressable>
        </View>

        <TextInput
          value={viewModel.searchInput}
          onChangeText={viewModel.setSearchInput}
          placeholder="Cari karyawan"
          placeholderTextColor="#6B7280"
          style={styles.searchInput}
        />

        <View style={styles.filterContainer}>
          {FILTER_OPTIONS.map((option) => {
            const isActive = option.value === viewModel.statusFilter;

            return (
              <Pressable
                key={option.value}
                onPress={() => viewModel.setStatusFilter(option.value)}
                style={[styles.filterButton, isActive ? styles.filterButtonActive : null]}>
                <Text style={[styles.filterButtonText, isActive ? styles.filterButtonTextActive : null]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [router, viewModel]
  );

  const renderItem = ({ item }: { item: EmployeeItem }) => (
    <Pressable style={styles.card} onPress={() => router.push(`/employees/${item.id}`)}>
      <View style={styles.cardHeader}>
        <Text style={styles.employeeName}>{item.name}</Text>
        <View style={[styles.badge, statusBadgeStyle(item.is_active)]}>
          <Text style={[styles.badgeText, statusBadgeTextStyle(item.is_active)]}>{statusLabel(item.is_active)}</Text>
        </View>
      </View>
      <Text style={styles.employeePhone}>{item.phone_number || '-'}</Text>
      {item.notes ? <Text style={styles.employeeNotes}>{item.notes}</Text> : null}
    </Pressable>
  );

  if (viewModel.loading && viewModel.data.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingHeaderRow}>
            <SkeletonBlock style={styles.skeletonTitle} />
            <SkeletonBlock style={styles.skeletonAddButton} />
          </View>
          <SkeletonBlock style={styles.skeletonSearch} />
          <View style={styles.loadingFilterRow}>
            <SkeletonBlock style={styles.skeletonFilter} />
            <SkeletonBlock style={styles.skeletonFilter} />
            <SkeletonBlock style={styles.skeletonFilter} />
          </View>
          <SkeletonBlock style={styles.skeletonCard} />
          <SkeletonBlock style={styles.skeletonCard} />
          <SkeletonBlock style={styles.skeletonCard} />
        </View>
      </SafeAreaView>
    );
  }

  if (viewModel.error && viewModel.data.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {header}
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{viewModel.error}</Text>
          <Pressable style={styles.retryButton} onPress={viewModel.retry}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={viewModel.data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListFooterComponent={
          viewModel.loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color="#2563EB" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          viewModel.empty ? (
            <View style={styles.centerContainer}>
              <Text style={styles.helperText}>Karyawan tidak ditemukan</Text>
            </View>
          ) : null
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 12) + 88 }]}
        onEndReachedThreshold={0.3}
        onEndReached={viewModel.loadMore}
        refreshControl={
          <RefreshControl refreshing={viewModel.refreshing} onRefresh={viewModel.refreshData} tintColor="#2563EB" />
        }
      />

      {viewModel.error && viewModel.data.length > 0 ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>{viewModel.error}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  loadingContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  loadingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonTitle: {
    width: 148,
    height: 24,
    borderRadius: 8,
  },
  skeletonAddButton: {
    width: 94,
    height: 44,
    borderRadius: 12,
  },
  skeletonSearch: {
    width: '100%',
    height: 52,
    borderRadius: 12,
  },
  skeletonFilter: {
    width: 84,
    height: 38,
    borderRadius: 999,
  },
  skeletonCard: {
    width: '100%',
    height: 108,
    borderRadius: 14,
  },
  headerContainer: {
    paddingTop: 14,
    paddingBottom: 10,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#F1F5F9',
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#111827',
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  filterButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  filterButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#1D4ED8',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  employeeName: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  employeePhone: {
    color: '#4B5563',
    fontSize: 14,
  },
  employeeNotes: {
    color: '#6B7280',
    fontSize: 14,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeBadgeText: {
    color: '#166534',
  },
  inactiveBadgeText: {
    color: '#475569',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  helperText: {
    color: '#4B5563',
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerLoading: {
    paddingVertical: 12,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  infoBannerText: {
    color: '#1D4ED8',
    fontSize: 13,
    textAlign: 'center',
  },
});
