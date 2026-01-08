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
import { usersApi } from '../../src/services/api';
import { User, INSTRUMENTS } from '../../src/types';

export default function UsersScreen() {
  const { user: currentUser, isInitialized } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'allievo' | 'insegnante'>('allievo');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    ruolo: 'allievo' as string,
    data_nascita: '',
    note_admin: '',
    insegnante_id: '',  // For students: which teacher
    strumento: '',      // For teachers: which instrument
  });

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.ruolo === 'amministratore') {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, []);

  // Get teachers list for student assignment
  const teachers = users.filter(u => u.ruolo === 'insegnante' && u.attivo);
  
  // Get students list
  const students = users.filter(u => u.ruolo === 'allievo');

  const filteredUsers = users.filter(u => {
    const matchesTab = u.ruolo === activeTab;
    const fullName = `${u.nome} ${u.cognome}`.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      fullName.includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const openCreateModal = (ruolo: 'allievo' | 'insegnante') => {
    setEditingUser(null);
    setErrorMessage('');
    setFormData({
      nome: '',
      cognome: '',
      email: '',
      password: '',
      ruolo: ruolo,
      data_nascita: '',
      note_admin: '',
      insegnante_id: teachers[0]?.id || '',
      strumento: INSTRUMENTS[0]?.value || '',
    });
    setModalVisible(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setErrorMessage('');
    setFormData({
      nome: user.nome,
      cognome: user.cognome,
      email: user.email,
      password: '',
      ruolo: user.ruolo,
      data_nascita: (user as any).data_nascita || '',
      note_admin: user.note_admin || '',
      insegnante_id: (user as any).insegnante_id || '',
      strumento: (user as any).strumento || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    setErrorMessage('');
    
    if (!formData.nome.trim()) {
      setErrorMessage('Nome è obbligatorio');
      return;
    }
    if (!formData.cognome.trim()) {
      setErrorMessage('Cognome è obbligatorio');
      return;
    }
    if (!editingUser && !formData.email.trim()) {
      setErrorMessage('Email è obbligatoria');
      return;
    }
    // Validate email format
    if (!editingUser && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMessage('Formato email non valido');
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      setErrorMessage('Password è obbligatoria per i nuovi utenti');
      return;
    }
    if (!editingUser && formData.password.length < 6) {
      setErrorMessage('La password deve essere di almeno 6 caratteri');
      return;
    }
    // DATA DI NASCITA OBBLIGATORIA per allievi
    if (formData.ruolo === 'allievo' && !formData.data_nascita) {
      setErrorMessage('Data di nascita obbligatoria per gli allievi');
      return;
    }
    // Validate teacher selection for students
    if (formData.ruolo === 'allievo' && !formData.insegnante_id) {
      setErrorMessage('Seleziona un insegnante per l\'allievo');
      return;
    }
    // Validate instrument for teachers
    if (formData.ruolo === 'insegnante' && !formData.strumento) {
      setErrorMessage('Seleziona uno strumento per l\'insegnante');
      return;
    }

    // CHECK DUPLICATES BEFORE SAVING (only for new users)
    if (!editingUser) {
      try {
        const duplicateCheck = await usersApi.checkDuplicates({
          email: formData.email,
          nome: formData.nome,
          cognome: formData.cognome,
          data_nascita: formData.data_nascita || undefined,
        });
        if (duplicateCheck.exists) {
          setErrorMessage(duplicateCheck.message || 'Utente già esistente');
          return;
        }
      } catch (error) {
        // If duplicate check fails, continue with creation (will fail on backend if duplicate)
        console.log('Duplicate check failed, proceeding with creation');
      }
    }

    try {
      if (editingUser) {
        const updateData: any = {
          nome: formData.nome,
          cognome: formData.cognome,
          data_nascita: formData.data_nascita || undefined,
          note_admin: formData.note_admin || undefined,
        };
        if (formData.password.trim()) {
          updateData.password = formData.password;
        }
        // Update teacher assignment for students
        if (editingUser.ruolo === 'allievo') {
          updateData.insegnante_id = formData.insegnante_id;
        }
        // Update instrument for teachers
        if (editingUser.ruolo === 'insegnante') {
          updateData.strumento = formData.strumento;
        }
        await usersApi.update(editingUser.id, updateData);
        Alert.alert('Successo', 'Utente modificato con successo');
      } else {
        const createData: any = {
          ruolo: formData.ruolo,
          nome: formData.nome,
          cognome: formData.cognome,
          email: formData.email,
          password: formData.password,
          data_nascita: formData.data_nascita || undefined,
          note_admin: formData.note_admin || undefined,
        };
        // Add teacher assignment for students
        if (formData.ruolo === 'allievo') {
          createData.insegnante_id = formData.insegnante_id;
        }
        // Add instrument for teachers
        if (formData.ruolo === 'insegnante') {
          createData.strumento = formData.strumento;
        }
        await usersApi.create(createData);
        Alert.alert('Successo', `${formData.ruolo === 'allievo' ? 'Allievo' : 'Insegnante'} creato con successo`);
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Si è verificato un errore';
      setErrorMessage(msg);
      Alert.alert('Errore', msg);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const newStatus = !user.attivo;
      await usersApi.update(user.id, { attivo: newStatus });
      Alert.alert('Successo', `Utente ${newStatus ? 'attivato' : 'disattivato'}`);
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Si è verificato un errore');
    }
  };

  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await usersApi.delete(userToDelete.id);
      setDeleteModalVisible(false);
      setUserToDelete(null);
      Alert.alert('Eliminato!', 'L\'utente è stato rimosso con successo');
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Si è verificato un errore');
    }
  };

  // Helper to get teacher name
  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.nome} ${teacher.cognome}` : 'Non assegnato';
  };

  // Helper to get instrument label
  const getInstrumentLabel = (value: string) => {
    const instrument = INSTRUMENTS.find(i => i.value === value);
    return instrument ? instrument.label : value;
  };

  if (!isInitialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (currentUser?.ruolo !== 'amministratore') {
    return (
      <View style={styles.noAccessContainer}>
        <Ionicons name="lock-closed" size={64} color="#ccc" />
        <Text style={styles.noAccessText}>Accesso riservato agli amministratori</Text>
      </View>
    );
  }

  const studentsCount = users.filter(u => u.ruolo === 'allievo').length;
  const teachersCount = users.filter(u => u.ruolo === 'insegnante').length;

  return (
    <View style={styles.container}>
      {/* Action Buttons */}
      <View style={styles.actionsBar}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => openCreateModal('allievo')}
        >
          <Ionicons name="person-add" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Nuovo Allievo</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#10B981' }]} 
          onPress={() => openCreateModal('insegnante')}
        >
          <Ionicons name="school" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Nuovo Insegnante</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'allievo' && styles.activeTab]}
          onPress={() => setActiveTab('allievo')}
        >
          <Text style={[styles.tabText, activeTab === 'allievo' && styles.activeTabText]}>
            Allievi ({studentsCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'insegnante' && styles.activeTab]}
          onPress={() => setActiveTab('insegnante')}
        >
          <Text style={[styles.tabText, activeTab === 'insegnante' && styles.activeTabText]}>
            Insegnanti ({teachersCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca per nome o email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Users List */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Nessun risultato' : `Nessun ${activeTab === 'allievo' ? 'allievo' : 'insegnante'}`}
            </Text>
          </View>
        ) : (
          filteredUsers.map(user => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user.nome.charAt(0)}{user.cognome.charAt(0)}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.nome} {user.cognome}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                
                {/* Show teacher for students */}
                {user.ruolo === 'allievo' && (user as any).insegnante_id && (
                  <View style={styles.assignmentBadge}>
                    <Ionicons name="school" size={12} color="#4A90D9" />
                    <Text style={styles.assignmentText}>
                      {getTeacherName((user as any).insegnante_id)}
                    </Text>
                  </View>
                )}
                
                {/* Show instrument for teachers */}
                {user.ruolo === 'insegnante' && (user as any).strumento && (
                  <View style={[styles.assignmentBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="musical-notes" size={12} color="#F59E0B" />
                    <Text style={[styles.assignmentText, { color: '#F59E0B' }]}>
                      {getInstrumentLabel((user as any).strumento)}
                    </Text>
                  </View>
                )}
                
                <View style={[styles.statusBadge, { backgroundColor: user.attivo ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={[styles.statusText, { color: user.attivo ? '#065F46' : '#DC2626' }]}>
                    {user.attivo ? 'Attivo' : 'Disattivato'}
                  </Text>
                </View>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity 
                  style={styles.userActionBtn}
                  onPress={() => openEditModal(user)}
                >
                  <Ionicons name="pencil" size={18} color="#4A90D9" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.userActionBtn}
                  onPress={() => handleToggleStatus(user)}
                >
                  <Ionicons 
                    name={user.attivo ? 'pause-circle' : 'play-circle'} 
                    size={18} 
                    color={user.attivo ? '#F59E0B' : '#10B981'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.userActionBtn}
                  onPress={() => openDeleteModal(user)}
                >
                  <Ionicons name="trash" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={48} color="#EF4444" />
            </View>
            <Text style={styles.deleteModalTitle}>Eliminare questo utente?</Text>
            <Text style={styles.deleteModalName}>
              {userToDelete?.nome} {userToDelete?.cognome}
            </Text>
            <Text style={styles.deleteModalMessage}>
              Questa azione è irreversibile. Tutti i dati associati verranno persi.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity 
                style={styles.deleteModalCancel}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.deleteModalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteModalConfirm}
                onPress={confirmDelete}
              >
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.deleteModalConfirmText}>Elimina</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Create/Edit */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUser ? 'Modifica Utente' : `Nuovo ${formData.ruolo === 'allievo' ? 'Allievo' : 'Insegnante'}`}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
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

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nome *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.nome}
                  onChangeText={(text) => setFormData({ ...formData, nome: text })}
                  placeholder="Mario"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Cognome *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cognome}
                  onChangeText={(text) => setFormData({ ...formData, cognome: text })}
                  placeholder="Rossi"
                />
              </View>

              {!editingUser && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder="mario.rossi@email.it"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Password {editingUser ? '(lascia vuoto per non modificare)' : '*'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  placeholder={editingUser ? '••••••••' : 'Minimo 6 caratteri'}
                  secureTextEntry
                />
              </View>

              {/* Instrument Selection for Teachers */}
              {formData.ruolo === 'insegnante' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Strumento musicale *</Text>
                  <View style={styles.pickerContainer}>
                    {INSTRUMENTS.map(instrument => (
                      <TouchableOpacity
                        key={instrument.value}
                        style={[
                          styles.pickerOption,
                          formData.strumento === instrument.value && styles.pickerOptionSelected
                        ]}
                        onPress={() => setFormData({ ...formData, strumento: instrument.value })}
                      >
                        <Ionicons 
                          name={instrument.icon as any} 
                          size={16} 
                          color={formData.strumento === instrument.value ? '#fff' : '#666'} 
                        />
                        <Text style={[
                          styles.pickerOptionText,
                          formData.strumento === instrument.value && styles.pickerOptionTextSelected
                        ]}>
                          {instrument.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Teacher Selection for Students */}
              {formData.ruolo === 'allievo' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Insegnante di riferimento *</Text>
                  <View style={styles.pickerContainer}>
                    {teachers.length === 0 ? (
                      <Text style={styles.noOptionsText}>Nessun insegnante disponibile. Crea prima un insegnante.</Text>
                    ) : (
                      teachers.map(teacher => (
                        <TouchableOpacity
                          key={teacher.id}
                          style={[
                            styles.pickerOption,
                            formData.insegnante_id === teacher.id && styles.pickerOptionSelected
                          ]}
                          onPress={() => setFormData({ ...formData, insegnante_id: teacher.id })}
                        >
                          <Ionicons 
                            name="school" 
                            size={16} 
                            color={formData.insegnante_id === teacher.id ? '#fff' : '#666'} 
                          />
                          <Text style={[
                            styles.pickerOptionText,
                            formData.insegnante_id === teacher.id && styles.pickerOptionTextSelected
                          ]}>
                            {teacher.nome} {teacher.cognome}
                          </Text>
                          {(teacher as any).strumento && (
                            <Text style={[
                              styles.pickerOptionSub,
                              formData.insegnante_id === teacher.id && { color: 'rgba(255,255,255,0.8)' }
                            ]}>
                              ({getInstrumentLabel((teacher as any).strumento)})
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* Data di Nascita - DOPO Insegnante di riferimento, PRIMA di Note */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Data di Nascita {formData.ruolo === 'allievo' ? '*' : ''}
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.data_nascita}
                  onChangeText={(text) => setFormData({ ...formData, data_nascita: text })}
                  placeholder="YYYY-MM-DD (es: 2010-05-15)"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Note amministratore</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={formData.note_admin}
                  onChangeText={(text) => setFormData({ ...formData, note_admin: text })}
                  placeholder="Note interne (opzionale)"
                  multiline
                />
              </View>

              {editingUser && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={18} color="#4A90D9" />
                  <Text style={styles.infoBoxText}>
                    Email: {editingUser.email}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {editingUser ? 'Salva Modifiche' : 'Crea Utente'}
                </Text>
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
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  noAccessText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  actionsBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  actionButton: {
    flex: 1,
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
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  assignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    gap: 4,
  },
  assignmentText: {
    fontSize: 11,
    color: '#4A90D9',
    fontWeight: '500',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  userActionBtn: {
    padding: 8,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  deleteModalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90D9',
    marginBottom: 12,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  deleteModalConfirm: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteModalConfirmText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
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
    maxHeight: '90%',
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
    color: '#333',
  },
  formScroll: {
    padding: 16,
    maxHeight: 450,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  pickerOptionSelected: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#333',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  pickerOptionSub: {
    fontSize: 11,
    color: '#999',
  },
  noOptionsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#4A90D9',
    marginLeft: 8,
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  requiredHint: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
