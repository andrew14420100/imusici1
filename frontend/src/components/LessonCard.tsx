import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Lesson, LessonStatus } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface LessonCardProps {
  lesson: Lesson;
  courseName?: string;
  teacherName?: string;
  studentName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({ 
  lesson, 
  courseName,
  teacherName,
  studentName,
  onEdit, 
  onDelete 
}) => {
  const getStatusColor = () => {
    switch (lesson.status) {
      case LessonStatus.COMPLETED:
        return '#10B981';
      case LessonStatus.CANCELLED:
        return '#EF4444';
      default:
        return '#4A90D9';
    }
  };

  const getStatusLabel = () => {
    switch (lesson.status) {
      case LessonStatus.COMPLETED:
        return 'Completata';
      case LessonStatus.CANCELLED:
        return 'Annullata';
      default:
        return 'Programmata';
    }
  };

  const lessonDate = new Date(lesson.date_time);

  return (
    <View style={styles.card}>
      <View style={[styles.dateBox, { backgroundColor: getStatusColor() + '20' }]}>
        <Text style={[styles.dateDay, { color: getStatusColor() }]}>
          {format(lessonDate, 'd')}
        </Text>
        <Text style={[styles.dateMonth, { color: getStatusColor() }]}>
          {format(lessonDate, 'MMM', { locale: it })}
        </Text>
      </View>
      <View style={styles.info}>
        <View style={styles.timeRow}>
          <Ionicons name="time" size={14} color="#666" />
          <Text style={styles.time}>
            {format(lessonDate, 'HH:mm')} ({lesson.duration_minutes} min)
          </Text>
        </View>
        {courseName && <Text style={styles.course}>{courseName}</Text>}
        <View style={styles.participants}>
          {teacherName && (
            <View style={styles.participant}>
              <Ionicons name="school" size={12} color="#888" />
              <Text style={styles.participantText}>{teacherName}</Text>
            </View>
          )}
          {studentName && (
            <View style={styles.participant}>
              <Ionicons name="person" size={12} color="#888" />
              <Text style={styles.participantText}>{studentName}</Text>
            </View>
          )}
        </View>
        {lesson.notes && (
          <Text style={styles.notes} numberOfLines={1}>{lesson.notes}</Text>
        )}
      </View>
      <View style={styles.right}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Ionicons name="pencil" size={16} color="#4A90D9" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateMonth: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  info: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  course: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  participants: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  participantText: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  notes: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
