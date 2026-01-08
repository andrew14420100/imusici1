import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Course, CourseStatus } from '../types';

interface CourseCardProps {
  course: Course;
  teacherNames?: string[];
  onEdit?: () => void;
  onToggleStatus?: () => void;
  onViewDetails?: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  teacherNames = [],
  onEdit, 
  onToggleStatus,
  onViewDetails 
}) => {
  const isActive = course.status === CourseStatus.ACTIVE;
  
  const getInstrumentIcon = (instrument: string): keyof typeof Ionicons.glyphMap => {
    const lower = instrument.toLowerCase();
    if (lower.includes('piano')) return 'musical-notes';
    if (lower.includes('violino') || lower.includes('violin')) return 'musical-note';
    if (lower.includes('chitarra') || lower.includes('guitar')) return 'musical-notes';
    if (lower.includes('voce') || lower.includes('canto')) return 'mic';
    return 'musical-notes';
  };

  return (
    <TouchableOpacity 
      style={[styles.card, !isActive && styles.inactiveCard]} 
      onPress={onViewDetails}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: isActive ? '#EBF5FF' : '#F3F4F6' }]}>
        <Ionicons 
          name={getInstrumentIcon(course.instrument)} 
          size={24} 
          color={isActive ? '#4A90D9' : '#9CA3AF'} 
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, !isActive && styles.inactiveText]}>{course.name}</Text>
        <Text style={styles.instrument}>{course.instrument}</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="person" size={12} color="#666" />
            <Text style={styles.statText}>{course.teacher_ids.length} insegnanti</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people" size={12} color="#666" />
            <Text style={styles.statText}>{course.student_ids.length} allievi</Text>
          </View>
        </View>
        {teacherNames.length > 0 && (
          <Text style={styles.teachers} numberOfLines={1}>
            {teacherNames.join(', ')}
          </Text>
        )}
      </View>
      <View style={styles.status}>
        <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, isActive ? styles.activeText : styles.inactiveStatusText]}>
            {isActive ? 'Attivo' : 'Inattivo'}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
            <Ionicons name="pencil" size={18} color="#4A90D9" />
          </TouchableOpacity>
        )}
        {onToggleStatus && (
          <TouchableOpacity onPress={onToggleStatus} style={styles.actionBtn}>
            <Ionicons 
              name={isActive ? 'pause-circle' : 'play-circle'} 
              size={18} 
              color={isActive ? '#F59E0B' : '#10B981'} 
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveCard: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  inactiveText: {
    color: '#9CA3AF',
  },
  instrument: {
    fontSize: 13,
    color: '#4A90D9',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  teachers: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    fontStyle: 'italic',
  },
  status: {
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeText: {
    color: '#059669',
  },
  inactiveStatusText: {
    color: '#DC2626',
  },
  actions: {
    flexDirection: 'row',
  },
  actionBtn: {
    padding: 8,
  },
});
