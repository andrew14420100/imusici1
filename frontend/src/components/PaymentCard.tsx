import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Payment, PaymentStatus, PaymentType } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface PaymentCardProps {
  payment: Payment;
  userName?: string;
  onEdit?: () => void;
  onMarkPaid?: () => void;
}

export const PaymentCard: React.FC<PaymentCardProps> = ({ 
  payment, 
  userName,
  onEdit, 
  onMarkPaid 
}) => {
  const getStatusColor = () => {
    switch (payment.status) {
      case PaymentStatus.PAID:
        return '#10B981';
      case PaymentStatus.OVERDUE:
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const getStatusLabel = () => {
    switch (payment.status) {
      case PaymentStatus.PAID:
        return 'Pagato';
      case PaymentStatus.OVERDUE:
        return 'Scaduto';
      default:
        return 'In Attesa';
    }
  };

  const isStudentFee = payment.payment_type === PaymentType.STUDENT_FEE;

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: isStudentFee ? '#EBF5FF' : '#FEF3C7' }]}>
        <Ionicons 
          name={isStudentFee ? 'school' : 'briefcase'} 
          size={22} 
          color={isStudentFee ? '#4A90D9' : '#F59E0B'} 
        />
      </View>
      <View style={styles.info}>
        {userName && <Text style={styles.userName}>{userName}</Text>}
        <Text style={styles.description}>{payment.description}</Text>
        <Text style={styles.type}>
          {isStudentFee ? 'Quota Studente' : 'Compenso Insegnante'}
        </Text>
        <View style={styles.dateRow}>
          <Ionicons name="calendar" size={12} color="#888" />
          <Text style={styles.date}>
            Scadenza: {format(new Date(payment.due_date), 'd MMM yyyy', { locale: it })}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>€{payment.amount.toFixed(2)}</Text>
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
          {onMarkPaid && payment.status !== PaymentStatus.PAID && (
            <TouchableOpacity onPress={onMarkPaid} style={styles.actionBtn}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
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
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },
  type: {
    fontSize: 11,
    color: '#4A90D9',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  date: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
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
