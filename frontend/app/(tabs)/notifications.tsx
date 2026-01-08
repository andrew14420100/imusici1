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
import { notificationsApi } from '../../src/services/api';
import { Notification } from '../../src/types';

export default function NotificationsScreen() {
  const { user: currentUser, isInitialized } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    titolo: '',
    messaggio: '',
    tipo: 'generale',
  });

  const isAdmin = currentUser?.ruolo === 'amministratore';

  const fetchData = async () => {
    try {
      const data = await notificationsApi.getAll(!showInactive);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      fetchData();
    }
  }, [showInactive, isInitialized]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [showInactive]);

  // Helper to get notification field (handles both old and new field names)
  const getTitle = (n: Notification) => n.titolo || n.title || '';
  const getMessage = (n: Notification) => n.messaggio || n.message || '';
  const getType = (n: Notification) => n.tipo || n.notification_type || 'generale';
  const getId = (n: Notification) => n.id || n.notification_id || '';
  const isActive = (n: Notification) => n.attivo ?? n.is_active ?? true;
  const getCreatedAt = (n: Notification) => n.data_creazione || n.created_at || '';

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'pagamento':
      case 'promemoria_pagamento':
        return 'card';
      case 'lezione':
      case 'promemoria_lezione':
        return 'calendar';
      default:
        return 'megaphone';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pagamento':
      case 'promemoria_pagamento':
        return '#F59E0B';
      case 'lezione':
      case 'promemoria_lezione':
        return '#10B981';
      default:
        return '#4A90D9';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pagamento':
      case 'promemoria_pagamento':
        return 'Pagamento';
      case 'lezione':
      case 'promemoria_lezione':
        return 'Lezione';
      default:
        return 'Generale';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const openModal = (notification?: Notification) => {
    setErrorMessage('');
    if (notification) {
      setEditingNotification(notification);
      setFormData({
        titolo: getTitle(notification),
        messaggio: getMessage(notification),
        tipo: getType(notification),
      });
    } else {
      setEditingNotification(null);
      setFormData({
        titolo: '',
        messaggio: '',
        tipo: 'generale',
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    setErrorMessage('');
    if (!formData.titolo.trim()) {
      setErrorMessage('Il titolo è obbligatorio');
      return;
    }
    if (!formData.messaggio.trim()) {
      setErrorMessage('Il messaggio è obbligatorio');
      return;
    }
    try {
      if (editingNotification) {
        await notificationsApi.update(getId(editingNotification), {
          titolo: formData.titolo,
          messaggio: formData.messaggio,
        });
        Alert.alert('Successo', 'Notifica aggiornata');
      } else {
        await notificationsApi.create({
          titolo: formData.titolo,
          messaggio: formData.messaggio,
          tipo: formData.tipo,
          destinatari_ids: [],
        });
        Alert.alert('Successo', 'Notifica creata');
      }
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Si è verificato un errore';
      setErrorMessage(msg);
      Alert.alert('Errore', msg);
    }
  };

  const handleToggleActive = async (notification: Notification) => {
    try {
      await notificationsApi.update(getId(notification), {
        attivo: !isActive(notification),
      });
      fetchData();
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Si è verificato un errore');
    }
  };

  const openDeleteModal = (notification: Notification) => {
    setNotificationToDelete(notification);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!notificationToDelete) return;
    try {
      await notificationsApi.delete(getId(notificationToDelete));
      setDeleteModalVisible(false);
      setNotificationToDelete(null);
      Alert.alert('Eliminata!', 'La notifica è stata rimossa');
      fetchData();
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Si è verificato un errore');
    }
  };

  if (!isInitialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Admin Actions */}
      {isAdmin && (
        <View style={styles.actionsBar}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => openModal()}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Nuova Notifica</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toggle inactive */}
      {isAdmin && (
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={() => setShowInactive(!showInactive)}
          >
            <Ionicons 
              name={showInactive ? 'checkbox' : 'square-outline'} 
              size={20} 
              color="#4A90D9" 
            />
            <Text style={styles.toggleText}>Mostra anche disattivate</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Nessuna notifica</Text>
          </View>
        ) : (
          notifications.map(notification => (
            <View 
              key={getId(notification)} 
              style={[styles.notificationCard, !isActive(notification) && styles.inactiveCard]}
            >
              <View style={[styles.iconContainer, { backgroundColor: getTypeColor(getType(notification)) + '20' }]}>
                <Ionicons 
                  name={getTypeIcon(getType(notification))} 
                  size={22} 
                  color={getTypeColor(getType(notification))} 
                />
              </View>
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={[styles.notificationTitle, !isActive(notification) && styles.inactiveText]}>
                    {getTitle(notification)}
                  </Text>
                  {!isActive(notification) && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveBadgeText}>Disattivata</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.notificationMessage} numberOfLines={3}>
                  {getMessage(notification)}
                </Text>
                <View style={styles.notificationMeta}>
                  <View style={[styles.typeBadge, { backgroundColor: getTypeColor(getType(notification)) + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: getTypeColor(getType(notification)) }]}>
                      {getTypeLabel(getType(notification))}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {formatDate(getCreatedAt(notification))}
                  </Text>
                </View>
              </View>
              {isAdmin && (
                <View style={styles.notificationActions}>
                  <TouchableOpacity onPress={() => openModal(notification)} style={styles.actionIcon}>
                    <Ionicons name="pencil" size={18} color="#4A90D9" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleToggleActive(notification)} style={styles.actionIcon}>
                    <Ionicons 
                      name={isActive(notification) ? 'eye-off' : 'eye'} 
                      size={18} 
                      color={isActive(notification) ? '#F59E0B' : '#10B981'} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openDeleteModal(notification)} style={styles.actionIcon}>
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
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
              <Ionicons name="megaphone" size={40} color="#EF4444" />
            </View>
            <Text style={styles.deleteModalTitle}>Eliminare notifica?</Text>
            <Text style={styles.deleteModalNotifTitle}>
              {notificationToDelete ? getTitle(notificationToDelete) : ''}
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

      {/* Create/Edit Modal */}
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
                {editingNotification ? 'Modifica Notifica' : 'Nuova Notifica'}
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
                <Text style={styles.label}>Titolo *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.titolo}
                  onChangeText={(text) => setFormData({ ...formData, titolo: text })}
                  placeholder="Titolo della notifica"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Messaggio *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.messaggio}
                  onChangeText={(text) => setFormData({ ...formData, messaggio: text })}
                  placeholder="Scrivi il messaggio..."
                  multiline
                  numberOfLines={4}
                />
              </View>

              {!editingNotification && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Tipo</Text>
                  <View style={styles.typeSelector}>
                    {[
                      { value: 'generale', label: 'Generale', icon: 'megaphone' },
                      { value: 'pagamento', label: 'Pagamento', icon: 'card' },
                      { value: 'lezione', label: 'Lezione', icon: 'calendar' },
                    ].map(type => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.typeOption,
                          formData.tipo === type.value && styles.typeOptionSelected
                        ]}
                        onPress={() => setFormData({ ...formData, tipo: type.value })}
                      >
                        <Ionicons 
                          name={type.icon as any} 
                          size={20} 
                          color={formData.tipo === type.value ? '#fff' : '#666'} 
                        />
                        <Text style={[
                          styles.typeOptionText,
                          formData.tipo === type.value && styles.typeOptionTextSelected
                        ]}>{type.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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
                  {editingNotification ? 'Salva' : 'Pubblica'}
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
  toggleContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
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
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inactiveCard: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  inactiveText: {
    color: '#999',
  },
  inactiveBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    color: '#999',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
    color: '#999',
  },
  notificationActions: {
    justifyContent: 'center',
    gap: 8,
  },
  actionIcon: {
    padding: 4,
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
  deleteModalNotifTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90D9',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    gap: 4,
  },
  typeOptionSelected: {
    backgroundColor: '#4A90D9',
  },
  typeOptionText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  typeOptionTextSelected: {
    color: '#fff',
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
