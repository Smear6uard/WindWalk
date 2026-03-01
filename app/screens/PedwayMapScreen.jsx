import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const LANDMARKS = [
  { key: 'macys', icon: 'storefront', label: "Macy's Basement", top: '23%', left: '22%' },
  { key: 'station', icon: 'train', label: 'Millennium Station', top: '44%', left: '66%' },
  { key: 'hall', icon: 'bank', label: 'City Hall', top: '69%', left: '24%' },
];

function Logo() {
  return (
    <View style={styles.logoWrap}>
      <Text style={[styles.logoText, styles.logoBlue]}>WIND</Text>
      <Text style={[styles.logoText, styles.logoGreen]}>WA</Text>
      <Text style={[styles.logoText, styles.logoYellow]}>L</Text>
      <Text style={[styles.logoText, styles.logoRed]}>K</Text>
      <MaterialCommunityIcons name="walk" size={17} color="#ef4444" />
    </View>
  );
}

function LineSegment({ top, left, width, height, color, dashed = false }) {
  return (
    <View
      style={[
        styles.segment,
        {
          top,
          left,
          width,
          height,
          backgroundColor: color,
          borderStyle: dashed ? 'dashed' : 'solid',
          borderWidth: dashed ? 1 : 0,
          borderColor: color,
        },
      ]}
    />
  );
}

export default function PedwayMapScreen({ onNavigate }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => onNavigate?.('route')}>
          <Ionicons name="arrow-back" size={24} color="#3b82f6" />
        </Pressable>
        <Logo />
        <Pressable style={styles.headerButton} onPress={() => onNavigate?.('search')}>
          <Ionicons name="settings-outline" size={23} color="#3b82f6" />
        </Pressable>
      </View>

      <View style={styles.undergroundBanner}>
        <MaterialCommunityIcons name="subway-variant" size={18} color="#ffffff" />
        <Text style={styles.undergroundText}>You Are Underground</Text>
      </View>

      <View style={styles.mapArea}>
        {Array.from({ length: 7 }).map((_, idx) => (
          <View key={`h-${idx}`} style={[styles.gridLineHorizontal, { top: `${14 + idx * 12}%` }]} />
        ))}
        {Array.from({ length: 4 }).map((_, idx) => (
          <View key={`v-${idx}`} style={[styles.gridLineVertical, { left: `${18 + idx * 20}%` }]} />
        ))}

        <LineSegment top="68%" left="25%" width={8} height="14%" color="#3b82f6" />
        <LineSegment top="54%" left="25%" width="24%" height={8} color="#3b82f6" />
        <LineSegment top="39%" left="49%" width={8} height="15%" color="#3b82f6" />
        <LineSegment top="39%" left="49%" width="26%" height={8} color="#3b82f6" />
        <LineSegment top="20%" left="74%" width={8} height="19%" color="#3b82f6" />

        <LineSegment top="74%" left="25%" width={6} height="16%" color="#ef4444" dashed />
        <LineSegment top="74%" left="25%" width="24%" height={6} color="#ef4444" dashed />
        <LineSegment top="61%" left="49%" width={6} height="13%" color="#ef4444" dashed />

        <View style={styles.pulseWrap}>
          <View style={styles.pulseDot} />
        </View>

        {LANDMARKS.map((landmark) => (
          <View key={landmark.key} style={[styles.landmarkWrap, { top: landmark.top, left: landmark.left }]}>
            <MaterialIcons name={landmark.icon} size={20} color="#3b82f6" />
            <View style={styles.landmarkLabelWrap}>
              <Text style={styles.landmarkLabel}>{landmark.label}</Text>
            </View>
          </View>
        ))}

        <View style={styles.searchOverlay}>
          <Ionicons name="search-outline" size={19} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Pedway exits or landmarks"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.leftControls}>
          <View style={styles.zoomControl}>
            <Pressable style={styles.zoomBtn}>
              <Ionicons name="add" size={20} color="#475569" />
            </Pressable>
            <View style={styles.zoomDivider} />
            <Pressable style={styles.zoomBtn}>
              <Ionicons name="remove" size={20} color="#475569" />
            </Pressable>
          </View>
          <Pressable style={styles.locateBtn}>
            <Ionicons name="navigate" size={19} color="#3b82f6" />
          </Pressable>
        </View>

        <Pressable style={styles.surfaceButton} onPress={() => onNavigate?.('route')}>
          <MaterialIcons name="layers" size={18} color="#ffffff" />
          <Text style={styles.surfaceButtonText}>Surface View</Text>
        </Pressable>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoThumb} />
        <View style={styles.infoBody}>
          <Text numberOfLines={1} style={styles.infoTitle}>
            Macy's Basement Entrance
          </Text>
          <View style={styles.infoMeta}>
            <Text style={styles.openBadge}>Open</Text>
            <Text style={styles.closeText}>Closes 7:00 PM</Text>
          </View>
        </View>
        <Pressable style={styles.directionBtn}>
          <Ionicons name="paper-plane" size={20} color="#ffffff" />
        </Pressable>
      </View>

      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem}>
          <MaterialIcons name="map" size={27} color="#3b82f6" />
          <Text style={[styles.navText, styles.navTextActive]}>Map</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => onNavigate?.('route')}>
          <MaterialCommunityIcons name="walk" size={24} color="#94a3b8" />
          <Text style={styles.navText}>Route</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => onNavigate?.('search')}>
          <Ionicons name="settings-outline" size={23} color="#94a3b8" />
          <Text style={styles.navText}>Settings</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  logoText: {
    fontSize: 23,
    letterSpacing: -0.5,
    fontFamily: 'sans-serif-medium',
  },
  logoBlue: { color: '#3b82f6' },
  logoGreen: { color: '#22c55e' },
  logoYellow: { color: '#eab308' },
  logoRed: { color: '#ef4444' },
  undergroundBanner: {
    height: 38,
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  undergroundText: {
    color: '#ffffff',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'sans-serif-medium',
  },
  mapArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(34,197,94,0.25)',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(34,197,94,0.25)',
  },
  segment: {
    position: 'absolute',
    borderRadius: 5,
  },
  pulseWrap: {
    position: 'absolute',
    top: '58%',
    left: '47%',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.22)',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  landmarkWrap: {
    position: 'absolute',
    alignItems: 'center',
    gap: 3,
  },
  landmarkLabelWrap: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  landmarkLabel: {
    color: '#334155',
    fontSize: 11,
    fontFamily: 'sans-serif-medium',
  },
  searchOverlay: {
    position: 'absolute',
    top: 14,
    left: 12,
    right: 12,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: '#1e293b',
    fontSize: 15,
  },
  leftControls: {
    position: 'absolute',
    left: 12,
    bottom: 16,
    gap: 8,
  },
  zoomControl: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  locateBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  surfaceButton: {
    position: 'absolute',
    right: 12,
    bottom: 20,
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  surfaceButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  infoCard: {
    minHeight: 94,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f1f5f9',
  },
  infoBody: {
    flex: 1,
  },
  infoTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontFamily: 'sans-serif-medium',
  },
  infoMeta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  openBadge: {
    color: '#15803d',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 11,
    fontFamily: 'sans-serif-medium',
  },
  closeText: {
    color: '#64748b',
    fontSize: 13,
  },
  directionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNav: {
    minHeight: 78,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 5,
  },
  navItem: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  navTextActive: {
    color: '#3b82f6',
    fontFamily: 'sans-serif-medium',
  },
});
