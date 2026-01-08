import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { coursesApi, lessonsApi, usersApi } from '../../src/services/api';
import { Course, Lesson, User, UserRole, CourseStatus, LessonStatus } from '../../src/types';
import { CourseCard } from '../../src/components/CourseCard';
import { LessonCard } from '../../src/components/LessonCard';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CoursesScreen() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'corsi' | 'lezioni'>('corsi');
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  
  // Form data
  const [courseForm, setCourseForm] = useState({
    name: '',
    instrument: '',
    description: '',
  });
  const [lessonForm, setLessonForm] = useState({
    course_id: '',
    teacher_id: '',
    student_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    duration_minutes: 60,
    notes: '',
  });

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const fetchData = async () => {
    try {
      const [coursesData, lessonsData, usersData] = await Promise.all([
        coursesApi.getAll(),
        lessonsApi.getAll(),
        usersApi.getAll(),
      ]);
      setCourses(coursesData);
      setLessons(lessonsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    return user?.name || 'Sconosciuto';
  };

  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.course_id === courseId);
    return course?.name || 'Corso sconosciuto';
  };

  const getTeacherNames = (teacherIds: string[]) => {
    return teacherIds.map(id => getUserName(id));
  };

  const teachers = users.filter(u => u.role === UserRole.TEACHER);
  const students = users.filter(u => u.role === UserRole.STUDENT);

  // Filter data
  const filteredCourses = courses.filter(c => {
    if (!isAdmin) {
      // Non-admin users see only their courses
      if (currentUser?.role === UserRole.TEACHER) {
        return c.teacher_ids.includes(currentUser.user_id);
      } else if (currentUser?.role === UserRole.STUDENT) {
        return c.student_ids.includes(currentUser.user_id);
      }
    }
    const matchesSearch = searchQuery === '' || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instrument.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredLessons = lessons.filter(l => {
    if (!isAdmin) {
      // Non-admin users see only their lessons
      if (currentUser?.role === UserRole.TEACHER) {
        return l.teacher_id === currentUser.user_id;
      } else if (currentUser?.role === UserRole.STUDENT) {
        return l.student_id === currentUser.user_id;
      }
    }
    return true;
  }).sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

  // Course handlers
  const openCourseModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setCourseForm({
        name: course.name,
        instrument: course.instrument,
        description: course.description || '',
      });
    } else {
      setEditingCourse(null);
      setCourseForm({ name: '', instrument: '', description: '' });
    }
    setCourseModalVisible(true);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.name || !courseForm.instrument) {
      Alert.alert('Errore', 'Nome e strumento sono obbligatori');
      return;
    }
    try {
      if (editingCourse) {
        await coursesApi.update(editingCourse.course_id, courseForm);
      } else {
        await coursesApi.create(courseForm);
      }
      setCourseModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Si \u00e8 verificato un errore');
    }
  };

  const handleToggleCourseStatus = async (course: Course) => {
    try {
      const newStatus = course.status === CourseStatus.ACTIVE ? CourseStatus.INACTIVE : CourseStatus.ACTIVE;
      await coursesApi.update(course.course_id, { status: newStatus });
      fetchData();
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Si \u00e8 verificato un errore');
    }
  };

  // Lesson handlers
  const openLessonModal = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      const dt = new Date(lesson.date_time);
      setLessonForm({
        course_id: lesson.course_id,
        teacher_id: lesson.teacher_id,
        student_id: lesson.student_id,
        date: dt.toISOString().split('T')[0],
        time: format(dt, 'HH:mm'),
        duration_minutes: lesson.duration_minutes,
        notes: lesson.notes || '',
      });
    } else {
      setEditingLesson(null);
      setLessonForm({
        course_id: courses[0]?.course_id || '',
        teacher_id: teachers[0]?.user_id || '',
        student_id: students[0]?.user_id || '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        duration_minutes: 60,
        notes: '',
      });
    }
    setLessonModalVisible(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.course_id || !lessonForm.teacher_id || !lessonForm.student_id) {
      Alert.alert('Errore', 'Corso, insegnante e allievo sono obbligatori');
      return;
    }
    try {
      const dateTime = new Date(`${lessonForm.date}T${lessonForm.time}:00`).toISOString();
      if (editingLesson) {
        await lessonsApi.update(editingLesson.lesson_id, {
          date_time: dateTime,
          duration_minutes: lessonForm.duration_minutes,
          notes: lessonForm.notes || undefined,
        });
      } else {
        await lessonsApi.create({
          course_id: lessonForm.course_id,
          teacher_id: lessonForm.teacher_id,
          student_id: lessonForm.student_id,
          date_time: dateTime,
          duration_minutes: lessonForm.duration_minutes,
          notes: lessonForm.notes || undefined,
        });
      }
      setLessonModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Si \u00e8 verificato un errore');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    Alert.alert(
      'Conferma',
      'Vuoi eliminare questa lezione?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Elimina', 
          style: 'destructive',
          onPress: async () => {
            try {
              await lessonsApi.delete(lessonId);
              fetchData();
            } catch (error: any) {
              Alert.alert('Errore', error.response?.data?.detail || 'Si \u00e8 verificato un errore');
            }
          }
        },
      ]
    );
  };

  const handleUpdateLessonStatus = async (lesson: Lesson, newStatus: LessonStatus) => {
    try {
      await lessonsApi.update(lesson.lesson_id, { status: newStatus });
      fetchData();
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Si \u00e8 verificato un errore');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Admin Action Buttons */}
      {isAdmin && (
        <View style={styles.actionsBar}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => openCourseModal()}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Nuovo Corso</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10B981' }]} 
            onPress={() => openLessonModal()}
          >
            <Ionicons name="calendar" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Nuova Lezione</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'corsi' && styles.activeTab]}
          onPress={() => setActiveTab('corsi')}
        >
          <Text style={[styles.tabText, activeTab === 'corsi' && styles.activeTabText]}>
            Corsi ({filteredCourses.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'lezioni' && styles.activeTab]}
          onPress={() => setActiveTab('lezioni')}
        >
          <Text style={[styles.tabText, activeTab === 'lezioni' && styles.activeTabText]}>
            Lezioni ({filteredLessons.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search (only for courses) */}
      {activeTab === 'corsi' && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca per nome o strumento..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'corsi' ? (
          filteredCourses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nessun corso trovato</Text>
            </View>
          ) : (
            filteredCourses.map(course => (
              <CourseCard
                key={course.course_id}
                course={course}
                teacherNames={getTeacherNames(course.teacher_ids)}
                onEdit={isAdmin ? () => openCourseModal(course) : undefined}
                onToggleStatus={isAdmin ? () => handleToggleCourseStatus(course) : undefined}
              />
            ))
          )
        ) : (
          filteredLessons.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nessuna lezione trovata</Text>
            </View>
          ) : (
            filteredLessons.map(lesson => (
              <LessonCard
                key={lesson.lesson_id}
                lesson={lesson}
                courseName={getCourseName(lesson.course_id)}
                teacherName={getUserName(lesson.teacher_id)}
                studentName={getUserName(lesson.student_id)}
                onEdit={isAdmin || currentUser?.user_id === lesson.teacher_id ? () => openLessonModal(lesson) : undefined}
                onDelete={isAdmin ? () => handleDeleteLesson(lesson.lesson_id) : undefined}
              />
            ))
          )
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Course Modal */}
      <Modal
        visible={courseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCourseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCourse ? 'Modifica Corso' : 'Nuovo Corso'}
              </Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nome Corso *</Text>
                <TextInput
                  style={styles.input}
                  value={courseForm.name}
                  onChangeText={(text) => setCourseForm({ ...courseForm, name: text })}
                  placeholder="es. Pianoforte Base"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Strumento *</Text>
                <TextInput
                  style={styles.input}
                  value={courseForm.instrument}
                  onChangeText={(text) => setCourseForm({ ...courseForm, instrument: text })}
                  placeholder="es. Pianoforte, Violino, Chitarra"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descrizione</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={courseForm.description}
                  onChangeText={(text) => setCourseForm({ ...courseForm, description: text })}
                  placeholder="Descrizione del corso..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSaveCourse}
              >
                <Text style={styles.saveButtonText}>
                  {editingCourse ? 'Salva Modifiche' : 'Crea Corso'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Lesson Modal */}
      <Modal
        visible={lessonModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLessonModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingLesson ? 'Modifica Lezione' : 'Nuova Lezione'}
              </Text>
              <TouchableOpacity onPress={() => setLessonModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!editingLesson && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Corso *</Text>
                    <View style={styles.pickerContainer}>
                      {courses.filter(c => c.status === CourseStatus.ACTIVE).map(course => (
                        <TouchableOpacity
                          key={course.course_id}
                          style={[
                            styles.pickerOption,
                            lessonForm.course_id === course.course_id && styles.pickerOptionSelected
                          ]}
                          onPress={() => setLessonForm({ ...lessonForm, course_id: course.course_id })}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            lessonForm.course_id === course.course_id && styles.pickerOptionTextSelected
                          ]}>{course.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Insegnante *</Text>
                    <View style={styles.pickerContainer}>
                      {teachers.map(teacher => (
                        <TouchableOpacity
                          key={teacher.user_id}
                          style={[
                            styles.pickerOption,
                            lessonForm.teacher_id === teacher.user_id && styles.pickerOptionSelected
                          ]}
                          onPress={() => setLessonForm({ ...lessonForm, teacher_id: teacher.user_id })}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            lessonForm.teacher_id === teacher.user_id && styles.pickerOptionTextSelected
                          ]}>{teacher.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Allievo *</Text>
                    <View style={styles.pickerContainer}>
                      {students.map(student => (
                        <TouchableOpacity
                          key={student.user_id}
                          style={[
                            styles.pickerOption,
                            lessonForm.student_id === student.user_id && styles.pickerOptionSelected
                          ]}
                          onPress={() => setLessonForm({ ...lessonForm, student_id: student.user_id })}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            lessonForm.student_id === student.user_id && styles.pickerOptionTextSelected
                          ]}>{student.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Data *</Text>
                  <TextInput
                    style={styles.input}
                    value={lessonForm.date}
                    onChangeText={(text) => setLessonForm({ ...lessonForm, date: text })}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Ora *</Text>
                  <TextInput
                    style={styles.input}
                    value={lessonForm.time}
                    onChangeText={(text) => setLessonForm({ ...lessonForm, time: text })}
                    placeholder="HH:MM"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Durata (minuti)</Text>
                <View style={styles.durationPicker}>
                  {[30, 45, 60, 90, 120].map(mins => (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.durationOption,
                        lessonForm.duration_minutes === mins && styles.durationOptionSelected
                      ]}
                      onPress={() => setLessonForm({ ...lessonForm, duration_minutes: mins })}
                    >
                      <Text style={[
                        styles.durationText,
                        lessonForm.duration_minutes === mins && styles.durationTextSelected
                      ]}>{mins}'</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Note</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={lessonForm.notes}
                  onChangeText={(text) => setLessonForm({ ...lessonForm, notes: text })}
                  placeholder="Note aggiuntive..."
                  multiline
                  numberOfLines={2}
                />
              </View>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSaveLesson}
              >
                <Text style={styles.saveButtonText}>
                  {editingLesson ? 'Salva Modifiche' : 'Crea Lezione'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4A90D9',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#4A90D9',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  pickerOptionSelected: {
    backgroundColor: '#4A90D9',
  },
  pickerOptionText: {
    fontSize: 13,
    color: '#333',
  },
  pickerOptionTextSelected: {
    color: '#fff',
  },
  durationPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  durationOptionSelected: {
    backgroundColor: '#4A90D9',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  durationTextSelected: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#4A90D9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
