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
import { paymentsApi, usersApi } from '../../src/services/api';
import { Payment, User, PaymentStatus } from '../../src/types';

// Payment type presets
const PAYMENT_PRESETS = {
  mensile: { importo: '150.00', descrizione: 'Quota mensile', label: 'Mensile' },
  annuale: { importo: '1500.00', descrizione: 'Quota annuale', label: 'Annuale' },
  iscrizione: { importo: '50.00', descrizione: 'Quota iscrizione', label: 'Iscrizione' },
  rimborso_spese: { importo: '', descrizione: 'Rimborso spese', label: 'Rimborso' },
};

export default function PaymentsScreen() {
  const { user: currentUser, isInitialized } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'allievi' | 'insegnanti'>('allievi');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [markPaidModalVisible, setMarkPaidModalVisible] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [paymentToMarkPaid, setPaymentToMarkPaid] = useState<Payment | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    utente_id: '',
    tipo: 'mensile' as string,
    importo: '',
    descrizione: '',
    data_scadenza: new Date().toISOString().split('T')[0],
  });

  const isAdmin = currentUser?.ruolo === 'amministratore';
  const isTeacher = currentUser?.ruolo === 'insegnante';
  const isStudent = currentUser?.ruolo === 'allievo';

  const fetchData = async () => {
    try {
      const [paymentsData, usersData] = await Promise.all([
        paymentsApi.getAll(),
        isAdmin ? usersApi.getAll() : Promise.resolve([]),
      ]);
      setPayments(paymentsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('❌ Errore', 'Impossibile caricare i pagamenti. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.nome} ${user.cognome}` : 'Sconosciuto';
  };

  const students = users.filter(u => u.ruolo === 'allievo');
  const teachers = users.filter(u => u.ruolo === 'insegnante');

  // Filter payments based on active tab
  const filteredPayments = payments.filter(p => {
    // For "allievi" tab: show mensile, annuale (student fees)
    // For "insegnanti" tab: show compenso_insegnante (teacher compensations)
    const isStudentPayment = p.tipo === 'mensile' || p.tipo === 'annuale';
    const isTeacherPayment = p.tipo === 'compenso_insegnante';
    
    const matchesTab = activeTab === 'allievi' ? isStudentPayment : isTeacherPayment;
    const matchesStatus = statusFilter === '' || p.stato === statusFilter;
    return matchesTab && matchesStatus;
  });

  const totalPending = filteredPayments
    .filter(p => p.stato !== PaymentStatus.PAID)
    .reduce((sum, p) => sum + p.importo, 0);
  const totalPaid = filteredPayments
    .filter(p => p.stato === PaymentStatus.PAID)
    .reduce((sum, p) => sum + p.importo, 0);

  const openModal = (payment?: Payment, presetType?: string) => {
    setErrorMessage('');
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        utente_id: payment.utente_id,
        tipo: payment.tipo,
        importo: payment.importo.toString(),
        descrizione: payment.descrizione,
        data_scadenza: payment.data_scadenza.split('T')[0],
      });
    } else {
      setEditingPayment(null);
      const defaultUsers = activeTab === 'allievi' ? students : teachers;
      const preset = presetType ? PAYMENT_PRESETS[presetType as keyof typeof PAYMENT_PRESETS] : null;
      const currentMonth = new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      
      setFormData({
        utente_id: defaultUsers[0]?.id || '',
        tipo: presetType === 'rimborso_spese' ? 'compenso_insegnante' : (presetType || 'mensile'),
        importo: preset?.importo || '',
        descrizione: preset ? `${preset.descrizione} ${presetType !== 'rimborso_spese' ? currentMonth : ''}` : '',
        data_scadenza: new Date().toISOString().split('T')[0],
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    setErrorMessage('');
    
    if (!formData.utente_id) {
      setErrorMessage('⚠️ Seleziona un utente');
      Alert.alert('❌ Errore', 'Seleziona un utente');
      return;
    }
    if (!formData.importo || parseFloat(formData.importo) <= 0) {
      setErrorMessage('⚠️ Importo non valido - inserisci un numero maggiore di 0');
      Alert.alert('❌ Errore', 'Importo non valido - inserisci un numero maggiore di 0');
      return;
    }
    if (!formData.descrizione.trim()) {
      setErrorMessage('⚠️ La descrizione è obbligatoria');
      Alert.alert('❌ Errore', 'La descrizione è obbligatoria');
      return;
    }
    if (!formData.data_scadenza) {
      setErrorMessage('⚠️ La data di scadenza è obbligatoria');
      Alert.alert('❌ Errore', 'La data di scadenza è obbligatoria');
      return;
    }
    
    try {
      console.log('Salvataggio pagamento...', formData);
      
      if (editingPayment) {
        const updated = await paymentsApi.update(editingPayment.id, {
          importo: parseFloat(formData.importo),
          descrizione: formData.descrizione,
          data_scadenza: formData.data_scadenza,
        });
        console.log('Pagamento aggiornato:', updated);
        
        // Aggiorna stato locale
        setPayments(prevPayments => 
          prevPayments.map(p => 
            p.id === editingPayment.id ? { ...p, ...updated } : p
          )
        );
        
        Alert.alert('✅ Successo', 'Pagamento aggiornato correttamente');
      } else {
        const newPayment = await paymentsApi.create({
          utente_id: formData.utente_id,
          tipo: formData.tipo,
          importo: parseFloat(formData.importo),
          descrizione: formData.descrizione,
          data_scadenza: formData.data_scadenza,
        });
        console.log('Nuovo pagamento creato:', newPayment);
        
        // Aggiungi al stato locale
        setPayments(prevPayments => [...prevPayments, newPayment]);
        
        Alert.alert('✅ Successo', 'Pagamento creato correttamente');
      }
      setModalVisible(false);
    } catch (error: any) {
      console.error('Errore salvataggio:', error);
      const msg = error.response?.data?.detail || error.message || 'Si è verificato un errore durante il salvataggio';
      setErrorMessage(`❌ ${msg}`);
      Alert.alert('❌ Errore', msg);
    }
  };

  const handleMarkPaid = async (payment: Payment) => {
    setPaymentToMarkPaid(payment);
    setMarkPaidModalVisible(true);
  };

  const confirmMarkPaid = async () => {
    if (!paymentToMarkPaid) return;
    
    try {
      console.log('Aggiornamento pagamento:', paymentToMarkPaid.id, 'stato:', 'pagato');
      const updatedPayment = await paymentsApi.update(paymentToMarkPaid.id, { stato: 'pagato' });
      console.log('Risposta server:', updatedPayment);
      
      // Aggiorna lo stato locale immediatamente
      setPayments(prevPayments => 
        prevPayments.map(p => 
          p.id === paymentToMarkPaid.id ? { ...p, stato: 'pagato', data_pagamento: new Date().toISOString() } : p
        )
      );
      
      setMarkPaidModalVisible(false);
      setPaymentToMarkPaid(null);
      Alert.alert('✅ Successo', 'Pagamento segnato come PAGATO');
    } catch (error: any) {
      console.error('Errore aggiornamento pagamento:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Si è verificato un errore durante l\'aggiornamento';
      Alert.alert('❌ Errore', errorMsg);
    }
  };

  const openDeleteModal = (payment: Payment) => {
    setPaymentToDelete(payment);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!paymentToDelete) return;
    try {
      console.log('Eliminazione pagamento:', paymentToDelete.id);
      await paymentsApi.delete(paymentToDelete.id);
      
      // Rimuovi dallo stato locale
      setPayments(prevPayments => prevPayments.filter(p => p.id !== paymentToDelete.id));
      
      setDeleteModalVisible(false);
      setPaymentToDelete(null);
      Alert.alert('✅ Eliminato!', 'Il pagamento è stato rimosso correttamente');
    } catch (error: any) {
      console.error('Errore eliminazione:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Si è verificato un errore durante l\'eliminazione';
      Alert.alert('❌ Errore', errorMsg);
    }
  };

  const getStatusColor = (stato: string) => {
    switch (stato) {
      case 'pagato': return { bg: '#D1FAE5', text: '#065F46' };
      case 'in_attesa': return { bg: '#FEF3C7', text: '#92400E' };
      case 'scaduto': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#E5E7EB', text: '#666' };
    }
  };

  const getStatusLabel = (stato: string) => {
    switch (stato) {
      case 'pagato': return 'Pagato';
      case 'in_attesa': return 'In Attesa';
      case 'scaduto': return 'Scaduto';
      default: return stato;
    }
  };

  if (!isInitialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  // For students: only show their own payments
  if (isStudent) {
    // Gli studenti vedono SOLO i propri pagamenti (già filtrati dal backend)
    const studentPayments = payments.filter(p => p.tipo === 'mensile' || p.tipo === 'annuale');
    
    const totalToPay = studentPayments
      .filter(p => p.stato !== 'pagato')
      .reduce((sum, p) => sum + p.importo, 0);
    
    const totalPaidStudent = studentPayments
      .filter(p => p.stato === 'pagato')
      .reduce((sum, p) => sum + p.importo, 0);
    
    return (
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>I miei Pagamenti</Text>
        </View>
        
        {/* Riepilogo per studente */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.summaryLabel}>Da Pagare</Text>
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
              €{totalToPay.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={styles.summaryLabel}>Pagato</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
              €{totalPaidStudent.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <ScrollView 
          style={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {studentPayments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nessun pagamento presente</Text>
            </View>
          ) : (
            studentPayments.map(payment => {
              const statusColors = getStatusColor(payment.stato);
              return (
                <View key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentDesc}>{payment.descrizione}</Text>
                      <Text style={styles.paymentDate}>
                        Scadenza: {new Date(payment.data_scadenza).toLocaleDateString('it-IT')}
                      </Text>
                      {payment.data_pagamento && (
                        <Text style={[styles.paymentDate, { color: '#10B981' }]}>
                          ✓ Pagato il: {new Date(payment.data_pagamento).toLocaleDateString('it-IT')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.paymentRight}>
                      <Text style={styles.paymentAmount}>€{payment.importo.toFixed(2)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                          {getStatusLabel(payment.stato)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  // For teachers: only show their own compensation (Rimborso Spese)
  if (isTeacher) {
    const teacherPayments = payments.filter(p => p.tipo === 'compenso_insegnante');
    
    const handleTeacherMarkPaid = async (paymentId: string) => {
      Alert.alert(
        'Conferma',
        'Vuoi segnare questo rimborso come pagato?',
        [
          { text: 'Annulla', style: 'cancel' },
          { 
            text: 'Conferma', 
            onPress: async () => {
              try {
                console.log('Aggiornamento rimborso:', paymentId);
                // Nota: Gli insegnanti non possono modificare direttamente
                // Questo è solo per visualizzazione - l'admin deve farlo
                Alert.alert('ℹ️ Info', 'Solo l\'amministratore può segnare i rimborsi come pagati. Contatta l\'amministrazione.');
              } catch (error: any) {
                console.error('Errore:', error);
                Alert.alert('❌ Errore', error.message || 'Si è verificato un errore');
              }
            }
          },
        ]
      );
    };
    
    return (
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>I tuoi Rimborsi Spese</Text>
        </View>
        <ScrollView 
          style={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {teacherPayments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nessun rimborso presente</Text>
            </View>
          ) : (
            teacherPayments.map(payment => {
              const statusColors = getStatusColor(payment.stato);
              return (
                <View key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentDesc}>{payment.descrizione}</Text>
                      <Text style={styles.paymentDate}>
                        Scadenza: {new Date(payment.data_scadenza).toLocaleDateString('it-IT')}
                      </Text>
                      {payment.data_pagamento && (
                        <Text style={[styles.paymentDate, { color: '#10B981' }]}>
                          ✓ Pagato il: {new Date(payment.data_pagamento).toLocaleDateString('it-IT')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.paymentRight}>
                      <Text style={styles.paymentAmount}>€{payment.importo.toFixed(2)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                          {getStatusLabel(payment.stato)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Admin only: Quick action buttons */}
      {isAdmin && (
        <>
          {/* Quick Add Buttons */}
          {activeTab === 'allievi' && (
            <View style={styles.quickActionsBar}>
              <TouchableOpacity 
                style={[styles.quickButton, { backgroundColor: '#4A90D9' }]} 
                onPress={() => openModal(undefined, 'mensile')}
              >
                <Ionicons name="calendar" size={16} color="#fff" />
                <Text style={styles.quickButtonText}>Mensile</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickButton, { backgroundColor: '#10B981' }]} 
                onPress={() => openModal(undefined, 'annuale')}
              >
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.quickButtonText}>Annuale</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickButton, { backgroundColor: '#8B5CF6' }]} 
                onPress={() => openModal(undefined, 'iscrizione')}
              >
                <Ionicons name="person-add" size={16} color="#fff" />
                <Text style={styles.quickButtonText}>Iscrizione</Text>
              </TouchableOpacity>
            </View>
          )}
          {activeTab === 'insegnanti' && (
            <View style={styles.quickActionsBar}>
              <TouchableOpacity 
                style={[styles.quickButton, { backgroundColor: '#F59E0B' }]} 
                onPress={() => openModal(undefined, 'rimborso_spese')}
              >
                <Ionicons name="receipt" size={16} color="#fff" />
                <Text style={styles.quickButtonText}>Rimborso Spese</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'allievi' && styles.activeTab]}
              onPress={() => setActiveTab('allievi')}
            >
              <Text style={[styles.tabText, activeTab === 'allievi' && styles.activeTabText]}>
                Quote Allievi
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'insegnanti' && styles.activeTab]}
              onPress={() => setActiveTab('insegnanti')}
            >
              <Text style={[styles.tabText, activeTab === 'insegnanti' && styles.activeTabText]}>
                Rimborsi Insegnanti
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.summaryLabel}>In Attesa</Text>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
            €{totalPending.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5' }]}>
          <Text style={styles.summaryLabel}>Pagato</Text>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>
            €{totalPaid.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filtra per stato:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === '' && styles.filterChipActive]}
            onPress={() => setStatusFilter('')}
          >
            <Text style={[styles.filterChipText, statusFilter === '' && styles.filterChipTextActive]}>Tutti</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'in_attesa' && styles.filterChipActive]}
            onPress={() => setStatusFilter('in_attesa')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'in_attesa' && styles.filterChipTextActive]}>In Attesa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'pagato' && styles.filterChipActive]}
            onPress={() => setStatusFilter('pagato')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'pagato' && styles.filterChipTextActive]}>Pagato</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'scaduto' && styles.filterChipActive]}
            onPress={() => setStatusFilter('scaduto')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'scaduto' && styles.filterChipTextActive]}>Scaduto</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Payments List */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Nessun pagamento trovato</Text>
          </View>
        ) : (
          filteredPayments.map(payment => {
            const statusColors = getStatusColor(payment.stato);
            return (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentUser}>{getUserName(payment.utente_id)}</Text>
                    <Text style={styles.paymentDesc}>{payment.descrizione}</Text>
                    <Text style={styles.paymentDate}>
                      Scadenza: {new Date(payment.data_scadenza).toLocaleDateString('it-IT')}
                    </Text>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmount}>€{payment.importo.toFixed(2)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.statusText, { color: statusColors.text }]}>
                        {getStatusLabel(payment.stato)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {isAdmin && (
                  <View style={styles.paymentActions}>
                    {payment.stato !== 'pagato' && (
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}
                        onPress={() => handleMarkPaid(payment)}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Pagato</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#EBF5FF' }]}
                      onPress={() => openModal(payment)}
                    >
                      <Ionicons name="pencil" size={16} color="#4A90D9" />
                      <Text style={[styles.actionBtnText, { color: '#4A90D9' }]}>Modifica</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                      onPress={() => openDeleteModal(payment)}
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Elimina</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
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
              <Ionicons name="receipt" size={40} color="#EF4444" />
            </View>
            <Text style={styles.deleteModalTitle}>Eliminare pagamento?</Text>
            <Text style={styles.deleteModalAmount}>
              €{paymentToDelete?.importo.toFixed(2)}
            </Text>
            <Text style={styles.deleteModalDesc}>
              {paymentToDelete?.descrizione}
            </Text>
            <Text style={styles.deleteModalMessage}>
              Questa azione non può essere annullata.
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
                {editingPayment ? 'Modifica Pagamento' : 'Nuovo Pagamento'}
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

              {!editingPayment && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Utente *</Text>
                  <View style={styles.pickerContainer}>
                    {(activeTab === 'allievi' ? students : teachers).map(user => (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.pickerOption,
                          formData.utente_id === user.id && styles.pickerOptionSelected
                        ]}
                        onPress={() => setFormData({ ...formData, utente_id: user.id })}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          formData.utente_id === user.id && styles.pickerOptionTextSelected
                        ]}>
                          {user.nome} {user.cognome}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Importo (€) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.importo}
                  onChangeText={(text) => setFormData({ ...formData, importo: text.replace(/[^0-9.]/g, '') })}
                  placeholder="150.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descrizione *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.descrizione}
                  onChangeText={(text) => setFormData({ ...formData, descrizione: text })}
                  placeholder="Es: Quota mensile Gennaio 2025"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Data Scadenza *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.data_scadenza}
                  onChangeText={(text) => setFormData({ ...formData, data_scadenza: text })}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              {editingPayment && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={18} color="#4A90D9" />
                  <Text style={styles.infoBoxText}>
                    Utente: {getUserName(editingPayment.utente_id)}
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
                  {editingPayment ? 'Salva' : 'Crea'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mark as Paid Confirmation Modal */}
      <Modal
        visible={markPaidModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMarkPaidModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={[styles.deleteIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={40} color="#10B981" />
            </View>
            <Text style={styles.deleteModalTitle}>Segnare come pagato?</Text>
            <Text style={styles.deleteModalAmount}>
              €{paymentToMarkPaid?.importo.toFixed(2)}
            </Text>
            <Text style={styles.deleteModalDesc}>
              {paymentToMarkPaid?.descrizione}
            </Text>
            <Text style={styles.deleteModalMessage}>
              Il pagamento verrà registrato come pagato oggi.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity 
                style={styles.deleteModalCancel}
                onPress={() => setMarkPaidModalVisible(false)}
              >
                <Text style={styles.deleteModalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteModalConfirm, { backgroundColor: '#10B981' }]}
                onPress={confirmMarkPaid}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.deleteModalConfirmText}>Conferma</Text>
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
  quickActionsBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  quickButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
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
  summaryContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  filterContainer: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4A90D9',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
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
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paymentActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
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
  deleteModalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 4,
  },
  deleteModalDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
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
    color: '#333',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
});
