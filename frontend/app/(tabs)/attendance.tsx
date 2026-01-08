import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { attendanceApi, usersApi } from '../../src/services/api';
import { Attendance, User, INSTRUMENTS } from '../../src/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Status types for attendance
const ATTENDANCE_STATUSES = [
  { value: 'presente', label: 'Presente', color: '#10B981', icon: 'checkmark-circle' },
  { value: 'assente', label: 'Assente', color: '#EF4444', icon: 'close-circle' },
  { value: 'assenza_giustificata', label: 'Assenza giustificata', color: '#F59E0B', icon: 'alert-circle' },
  { value: 'assenza_non_giustificata', label: 'Assenza non giust.', color: '#DC2626', icon: 'warning' },
  { value: 'recupero', label: 'Recupero', color: '#8B5CF6', icon: 'refresh' },
];

export default function AttendanceScreen() {
  const { user: currentUser, isInitialized } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Modals
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  
  // Form data
  const [attendanceForm, setAttendanceForm] = useState({
    allievo_id: '',
    data: new Date().toISOString().split('T')[0],
    stato: 'presente' as string,
    note: '',
  });

  const isAdmin = currentUser?.ruolo === 'amministratore';
  const isTeacher = currentUser?.ruolo === 'insegnante';
  const isStudent = currentUser?.ruolo === 'allievo';

  const fetchData = async () => {
    try {
      // Fetch all users first
      const usersData = await usersApi.getAll();
      setAllUsers(usersData);
      
      // For teachers: only show students assigned to them
      if (isTeacher && currentUser) {
        const myStudents = usersData.filter(u => 
          u.ruolo === 'allievo' && u.insegnante_id === currentUser.id
        );
        setStudents(myStudents);
        
        // Fetch attendance only for my students
        const studentIds = myStudents.map(s => s.id);
        const allAttendance = await attendanceApi.getAll();
        const myAttendance = allAttendance.filter(a => studentIds.includes(a.allievo_id));
        setAttendance(myAttendance);
      } 
      // For admin: show all students
      else if (isAdmin) {
        const allStudents = usersData.filter(u => u.ruolo === 'allievo');
        setStudents(allStudents);
        const allAttendance = await attendanceApi.getAll();
        setAttendance(allAttendance);
      }
      // For students: only show their own attendance
      else if (isStudent && currentUser) {
        const myAttendance = await attendanceApi.getAll({ allievo_id: currentUser.id });
        setAttendance(myAttendance);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized && currentUser) {
      fetchData();
    }
  }, [isInitialized, currentUser]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [currentUser]);

  const getStudentName = (studentId: string) => {
    const student = allUsers.find(s => s.id === studentId);
    return student ? `${student.nome} ${student.cognome}` : 'Studente';
  };

  const getStatusInfo = (status: string) => {
    return ATTENDANCE_STATUSES.find(s => s.value === status) || ATTENDANCE_STATUSES[0];
  };

  const getInstrumentLabel = (value: string) => {
    const inst = INSTRUMENTS.find(i => i.value === value);
    return inst?.label || value;
  };

  // Open modal for new attendance
  const openAttendanceModal = (student?: User) => {
    setErrorMessage('');
    setEditingAttendance(null);
    setAttendanceForm({
      allievo_id: student?.id || students[0]?.id || '',
      data: new Date().toISOString().split('T')[0],
      stato: 'presente',
      note: '',
    });
    setAttendanceModalVisible(true);
  };

  // Open modal for editing (admin only)
  const openEditModal = (att: Attendance) => {
    if (!isAdmin) {
      Alert.alert('Non autorizzato', 'Solo l\'amministratore può modificare le presenze');
      return;
    }
    setErrorMessage('');
    setEditingAttendance(att);
    setAttendanceForm({
      allievo_id: att.allievo_id,
      data: att.data.split('T')[0],
      stato: att.stato,
      note: att.note || '',
    });
    setAttendanceModalVisible(true);
  };

  const handleSaveAttendance = async () => {
    setErrorMessage('');
    
    if (!attendanceForm.allievo_id) {
      setErrorMessage('Seleziona un allievo');
      return;
    }
    if (!attendanceForm.data) {
      setErrorMessage('Seleziona una data');
      return;
    }
    if (!attendanceForm.stato) {
      setErrorMessage('Seleziona uno stato di presenza');
      return;
    }
    
    try {
      if (editingAttendance) {
        // Admin editing existing attendance
        await attendanceApi.update(editingAttendance.id, {
          stato: attendanceForm.stato,
          note: attendanceForm.note || undefined,
        });
        Alert.alert('Successo', 'Presenza aggiornata');
      } else {
        // Creating new attendance
        await attendanceApi.create({
          allievo_id: attendanceForm.allievo_id,
          data: attendanceForm.data,
          stato: attendanceForm.stato,
          note: attendanceForm.note || undefined,
        });
        Alert.alert('Successo', 'Presenza registrata');
      }
      setAttendanceModalVisible(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Si è verificato un errore';
      setErrorMessage(msg);
      Alert.alert('Errore', msg);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: it });
    } catch {
      return dateStr;
    }
  };

  if (!isInitialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  // STUDENT VIEW - Only their own attendance (read-only) with summary table
  if (isStudent) {
    // Calcola statistiche
    const presenze = attendance.filter(a => a.stato === 'presente').length;
    const assenze = attendance.filter(a => a.stato === 'assente' || a.stato === 'assenza_non_giustificata').length;
    const assenzeGiustificate = attendance.filter(a => a.stato === 'assenza_giustificata').length;
    const recuperi = attendance.filter(a => a.stato === 'recupero').length;
    const totale = attendance.length;

    return (
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>Le tue Presenze</Text>
          <Text style={styles.sectionSubtitle}>Riepilogo e storico completo</Text>
        </View>
        
        {/* Tabella Riepilogo */}
        <View style={styles.summaryTable}>
          <Text style={styles.tableTitle}>📊 Riepilogo Presenze</Text>
          <View style={styles.tableContainer}>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableCellHeader]}>
                <Text style={styles.tableCellHeaderText}>Stato</Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellHeader]}>
                <Text style={styles.tableCellHeaderText}>Totale</Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellHeader]}>
                <Text style={styles.tableCellHeaderText}>%</Text>
              </View>
            </View>
            
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.tableCellText, { color: '#10B981', marginLeft: 4 }]}>Presenze</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellValue}>{presenze}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellValue}>{totale > 0 ? Math.round((presenze/totale)*100) : 0}%</Text>
              </View>
            </View>
            
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="close-circle" size={16} color="#EF4444" />
                <Text style={[styles.tableCellText, { color: '#EF4444', marginLeft: 4 }]}>Assenze</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellValue}>{assenze}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellValue}>{totale > 0 ? Math.round((assenze/totale)*100) : 0}%</Text>
              </View>
            </View>
            
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                <Text style={[styles.tableCellText, { color: '#F59E0B', marginLeft: 4 }]}>Giustificate</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellValue}>{assenzeGiustificate}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellValue}>{totale > 0 ? Math.round((assenzeGiustificate/totale)*100) : 0}%</Text>
              </View>
            </View>
            
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="refresh" size={16} color="#8B5CF6" />
                <Text style={[styles.tableCellText, { color: '#8B5CF6', marginLeft: 4 }]}>Recuperi</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellValue}>{recuperi}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellValue}>{totale > 0 ? Math.round((recuperi/totale)*100) : 0}%</Text>
              </View>
            </View>
            
            <View style={[styles.tableRow, { backgroundColor: '#F1F5F9' }]}>
              <View style={[styles.tableCell, { backgroundColor: '#E2E8F0' }]}>
                <Ionicons name="calculator" size={16} color="#475569" />
                <Text style={[styles.tableCellText, { color: '#475569', fontWeight: '700', marginLeft: 4 }]}>TOTALE</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={[styles.tableCellValue, { fontWeight: '700' }]}>{totale}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={[styles.tableCellValue, { fontWeight: '700' }]}>100%</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Lista Storico */}
        <Text style={styles.historyTitleStudent}>📅 Storico Completo</Text>
        <ScrollView 
          style={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {attendance.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nessuna presenza registrata</Text>
            </View>
          ) : (
            attendance.map(att => {
              const statusInfo = getStatusInfo(att.stato);
              return (
                <View key={att.id} style={styles.attendanceCard}>
                  <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]} />
                  <View style={styles.attendanceContent}>
                    <Text style={styles.attendanceDate}>{formatDate(att.data)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                      <Ionicons name={statusInfo.icon as any} size={16} color={statusInfo.color} />
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                    {att.note && <Text style={styles.noteText}>{att.note}</Text>}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    );
  }

  // TEACHER/ADMIN VIEW
  return (
    <View style={styles.container}>
      {/* Header with action button */}
      {(isTeacher || isAdmin) && students.length > 0 && (
        <View style={styles.actionsBar}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => openAttendanceModal()}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Nuova Presenza</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Students List with Attendance */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {isTeacher ? 'Nessun allievo assegnato' : 'Nessun allievo presente'}
            </Text>
          </View>
        ) : (
          students.map(student => {
            const studentAttendance = attendance.filter(a => a.allievo_id === student.id);
            const recentAttendance = studentAttendance.slice(0, 5); // Last 5 records
            
            return (
              <View key={student.id} style={styles.studentCard}>
                <View style={styles.studentHeader}>
                  <View style={styles.studentInfo}>
                    <Ionicons name="person-circle" size={40} color="#4A90D9" />
                    <View style={styles.studentDetails}>
                      <Text style={styles.studentName}>{student.nome} {student.cognome}</Text>
                      {student.strumento && (
                        <Text style={styles.studentInstrument}>
                          {getInstrumentLabel(student.strumento)}
                        </Text>
                      )}
                    </View>
                  </View>
                  {(isTeacher || isAdmin) && (
                    <TouchableOpacity 
                      style={styles.addAttendanceBtn}
                      onPress={() => openAttendanceModal(student)}
                    >
                      <Ionicons name="add-circle" size={28} color="#4A90D9" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Status Buttons for Teacher */}
                {isTeacher && (
                  <View style={styles.quickStatusContainer}>
                    <Text style={styles.quickStatusLabel}>Segna presenza oggi:</Text>
                    <View style={styles.quickStatusButtons}>
                      {ATTENDANCE_STATUSES.map(status => (
                        <TouchableOpacity
                          key={status.value}
                          style={[styles.quickStatusBtn, { borderColor: status.color }]}
                          onPress={async () => {
                            try {
                              await attendanceApi.create({
                                allievo_id: student.id,
                                data: new Date().toISOString().split('T')[0],
                                stato: status.value,
                              });
                              Alert.alert('Registrato', `${student.nome}: ${status.label}`);
                              fetchData();
                            } catch (error: any) {
                              Alert.alert('Errore', error.response?.data?.detail || 'Errore');
                            }
                          }}
                        >
                          <Ionicons name={status.icon as any} size={18} color={status.color} />
                          <Text style={[styles.quickStatusText, { color: status.color }]}>
                            {status.label.split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Recent Attendance History */}
                {recentAttendance.length > 0 && (
                  <View style={styles.attendanceHistory}>
                    <Text style={styles.historyTitle}>Ultime presenze:</Text>
                    <View style={styles.historyList}>
                      {recentAttendance.map(att => {
                        const statusInfo = getStatusInfo(att.stato);
                        return (
                          <TouchableOpacity 
                            key={att.id} 
                            style={styles.historyItem}
                            onPress={() => isAdmin && openEditModal(att)}
                            disabled={!isAdmin}
                          >
                            <Text style={styles.historyDate}>{formatDate(att.data)}</Text>
                            <View style={[styles.historyBadge, { backgroundColor: statusInfo.color + '20' }]}>
                              <Text style={[styles.historyStatus, { color: statusInfo.color }]}>
                                {statusInfo.label}
                              </Text>
                            </View>
                            {isAdmin && (
                              <Ionicons name="pencil" size={14} color="#666" style={{ marginLeft: 4 }} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Attendance Modal */}
      <Modal
        visible={attendanceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAttendanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAttendance ? 'Modifica Presenza' : 'Registra Presenza'}
              </Text>
              <TouchableOpacity onPress={() => setAttendanceModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {!editingAttendance && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Allievo *</Text>
                  <View style={styles.pickerContainer}>
                    {students.map(student => (
                      <TouchableOpacity
                        key={student.id}
                        style={[
                          styles.pickerOption,
                          attendanceForm.allievo_id === student.id && styles.pickerOptionSelected
                        ]}
                        onPress={() => setAttendanceForm({ ...attendanceForm, allievo_id: student.id })}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          attendanceForm.allievo_id === student.id && styles.pickerOptionTextSelected
                        ]}>
                          {student.nome} {student.cognome}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {!editingAttendance && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Data *</Text>
                  <TextInput
                    style={styles.input}
                    value={attendanceForm.data}
                    onChangeText={(text) => setAttendanceForm({ ...attendanceForm, data: text })}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Stato *</Text>
                <View style={styles.statusSelector}>
                  {ATTENDANCE_STATUSES.map(status => (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.statusOption,
                        attendanceForm.stato === status.value && { backgroundColor: status.color + '20', borderColor: status.color }
                      ]}
                      onPress={() => setAttendanceForm({ ...attendanceForm, stato: status.value })}
                    >
                      <Ionicons 
                        name={status.icon as any} 
                        size={20} 
                        color={attendanceForm.stato === status.value ? status.color : '#666'} 
                      />
                      <Text style={[
                        styles.statusOptionText,
                        attendanceForm.stato === status.value && { color: status.color, fontWeight: '600' }
                      ]}>
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Note</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={attendanceForm.note}
                  onChangeText={(text) => setAttendanceForm({ ...attendanceForm, note: text })}
                  placeholder="Note aggiuntive..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setAttendanceModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSaveAttendance}
              >
                <Text style={styles.saveButtonText}>Salva</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#F8FAFC',
  },
  headerSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  actionsBar: {
    padding: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
  },
  studentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentDetails: {
    marginLeft: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  studentInstrument: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  addAttendanceBtn: {
    padding: 4,
  },
  quickStatusContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quickStatusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  quickStatusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  quickStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  attendanceHistory: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  historyTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  historyList: {
    gap: 6,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDate: {
    fontSize: 12,
    color: '#374151',
    width: 80,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  attendanceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusIndicator: {
    width: 4,
  },
  attendanceContent: {
    flex: 1,
    padding: 14,
  },
  attendanceDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  formScroll: {
    padding: 16,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerOptionSelected: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  statusSelector: {
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  statusOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#4A90D9',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // Stili per tabella riepilogo studente
  summaryTable: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  tableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableCell: {
    flex: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellHeader: {
    backgroundColor: '#4A90D9',
  },
  tableCellHeaderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  tableCellText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tableCellValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyTitleStudent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
});
