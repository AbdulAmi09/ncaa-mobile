import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { BigButton } from '@/components/big-button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import {
  type NewPaymentType,
  type PaymentDue,
  NEW_PAYMENT_TYPES,
  createPayment,
  fetchPaymentDues,
  formatNaira,
} from '@/lib/payments';
import { initializeMobilePayment } from '@/lib/paystack';
import { type PickedReceipt, pickReceiptImage, uploadReceipt } from '@/lib/receipt-upload';

const PAYMENT_CALLBACK_URL = 'ncaamobile://payments/callback';
const FREE_AMOUNT_TYPES: NewPaymentType[] = ['donation', 'certification'];

export default function NewPaymentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [step, setStep] = useState<'type' | 'method'>('type');
  const [dues, setDues] = useState<PaymentDue[]>([]);
  const [loadingDues, setLoadingDues] = useState(true);
  const [selectedType, setSelectedType] = useState<NewPaymentType | null>(null);
  const [method, setMethod] = useState<'paystack' | 'bank'>('paystack');
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [receipt, setReceipt] = useState<PickedReceipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!userId) return;
    fetchPaymentDues(userId).then(({ data }) => {
      setDues((data as PaymentDue[]) ?? []);
      setLoadingDues(false);
    });
  }, [userId]);

  const matchingDue = (type: NewPaymentType) => dues.find((d) => d.payment_type === type);
  const isFreeAmount = (type: NewPaymentType) => FREE_AMOUNT_TYPES.includes(type);
  const isDisabled = (type: NewPaymentType) => !isFreeAmount(type) && !matchingDue(type);

  function selectType(type: NewPaymentType) {
    if (isDisabled(type)) return;
    setSelectedType(type);
    const due = matchingDue(type);
    setAmount(isFreeAmount(type) ? '' : due ? String(due.amount) : '');
    setDetails('');
    setErrorText('');
    setStep('method');
  }

  async function handlePayWithPaystack() {
    if (!userId || !selectedType || !amount) return;
    setSubmitting(true);
    setErrorText('');
    const { data: payment, error: insertError } = await createPayment({
      arbiterId: userId,
      paymentType: selectedType,
      amount: Number(amount),
      description: details || NEW_PAYMENT_TYPES.find((t) => t.id === selectedType)?.label || null,
    });
    if (insertError || !payment) {
      setSubmitting(false);
      setErrorText("Couldn't start this payment. Please try again.");
      return;
    }
    const { authorizationUrl, error } = await initializeMobilePayment(payment.id);
    if (error || !authorizationUrl) {
      setSubmitting(false);
      setErrorText(error ?? "Couldn't start this payment. Please try again.");
      return;
    }
    await WebBrowser.openAuthSessionAsync(authorizationUrl, PAYMENT_CALLBACK_URL);
    setSubmitting(false);
    router.replace('/payments');
  }

  async function handlePickReceipt() {
    const { receipt: picked, error } = await pickReceiptImage();
    if (error) setErrorText(error);
    else if (picked) setReceipt(picked);
  }

  async function handleSubmitBankTransfer() {
    if (!userId || !selectedType || !amount || !receipt) return;
    setSubmitting(true);
    setErrorText('');
    const { path, error: uploadError } = await uploadReceipt(userId, receipt);
    if (uploadError || !path) {
      setSubmitting(false);
      setErrorText(uploadError ?? "Couldn't upload your receipt. Please try again.");
      return;
    }
    const { error: insertError } = await createPayment({
      arbiterId: userId,
      paymentType: selectedType,
      amount: Number(amount),
      description: details || NEW_PAYMENT_TYPES.find((t) => t.id === selectedType)?.label || null,
      paymentMethod: 'bank_transfer',
      receiptUrl: path,
    });
    setSubmitting(false);
    if (insertError) {
      setErrorText("Couldn't submit this payment. Please try again.");
      return;
    }
    router.replace('/payments');
  }

  const selectedDue = selectedType ? matchingDue(selectedType) : null;
  const selectedLabel = selectedType ? NEW_PAYMENT_TYPES.find((t) => t.id === selectedType)?.label : '';

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ThemedText type="title" style={styles.header}>
          Make a payment
        </ThemedText>

        <ScrollView contentContainerStyle={styles.content}>
          {!!errorText && (
            <Card>
              <ThemedText themeColor="danger">{errorText}</ThemedText>
            </Card>
          )}

          {step === 'type' && (
            <>
              {loadingDues ? (
                <ActivityIndicator />
              ) : (
                NEW_PAYMENT_TYPES.map((type) => {
                  const disabled = isDisabled(type.id);
                  return (
                    <Pressable key={type.id} onPress={() => selectType(type.id)} disabled={disabled}>
                      <Card style={[styles.typeCard, disabled && styles.typeCardDisabled]}>
                        <ThemedView style={styles.typeRow}>
                          <ThemedView>
                            <ThemedText type="smallBold">{type.label}</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {type.description}
                            </ThemedText>
                          </ThemedView>
                          {disabled ? (
                            <ThemedView type="backgroundSelected" style={styles.noDueBadge}>
                              <ThemedText type="small" themeColor="textSecondary">
                                No due
                              </ThemedText>
                            </ThemedView>
                          ) : (
                            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                          )}
                        </ThemedView>
                      </Card>
                    </Pressable>
                  );
                })
              )}
            </>
          )}

          {step === 'method' && selectedType && (
            <>
              {selectedDue && !isFreeAmount(selectedType) && (
                <Card>
                  <ThemedText type="small" themeColor="textSecondary">
                    Amount due
                  </ThemedText>
                  <ThemedText type="title">{formatNaira(selectedDue.amount)}</ThemedText>
                  {selectedDue.due_date && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.dueDateText}>
                      Due {new Date(selectedDue.due_date).toLocaleDateString('en-NG')}
                    </ThemedText>
                  )}
                </Card>
              )}

              {isFreeAmount(selectedType) && (
                <Card style={styles.formCard}>
                  <ThemedView>
                    <ThemedText type="small" themeColor="textSecondary">
                      Amount (₦)
                    </ThemedText>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="number-pad"
                      placeholder="Enter amount"
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
                    />
                  </ThemedView>
                  <ThemedView>
                    <ThemedText type="small" themeColor="textSecondary">
                      Details (optional)
                    </ThemedText>
                    <TextInput
                      value={details}
                      onChangeText={setDetails}
                      placeholder="Additional information"
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
                    />
                  </ThemedView>
                </Card>
              )}

              <ThemedView style={styles.methodRow}>
                {(['paystack', 'bank'] as const).map((m) => {
                  const active = method === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setMethod(m)}
                      style={[
                        styles.methodChip,
                        { borderColor: theme.border, backgroundColor: active ? theme.primary : theme.backgroundElement },
                      ]}>
                      <ThemedText type="smallBold" style={{ color: active ? theme.primaryText : theme.text }}>
                        {m === 'paystack' ? 'Pay with Paystack' : 'Bank transfer'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>

              {method === 'paystack' ? (
                <BigButton
                  label={`Pay ${selectedLabel}`}
                  onPress={handlePayWithPaystack}
                  loading={submitting}
                  disabled={!amount || submitting}
                />
              ) : (
                <>
                  <Card style={styles.formCard}>
                    <ThemedText type="smallBold">Bank details</ThemedText>
                    <ThemedText type="small">Bank Name: Access Bank</ThemedText>
                    <ThemedText type="small">Account: 1234567890</ThemedText>
                    <ThemedText type="small">Reference: your full name</ThemedText>
                  </Card>

                  <Pressable
                    onPress={handlePickReceipt}
                    style={[styles.receiptPicker, { borderColor: theme.border }]}>
                    {receipt ? (
                      <ThemedText type="small">{receipt.name}</ThemedText>
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={22} color={theme.textSecondary} />
                        <ThemedText type="small" themeColor="textSecondary">
                          Tap to attach your transfer receipt
                        </ThemedText>
                      </>
                    )}
                  </Pressable>

                  <BigButton
                    label="Submit for review"
                    onPress={handleSubmitBankTransfer}
                    loading={submitting}
                    disabled={!amount || !receipt || submitting}
                  />
                </>
              )}

              <BigButton label="Back" variant="secondary" onPress={() => setStep('type')} disabled={submitting} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  content: { padding: Spacing.four, gap: Spacing.three },
  typeCard: { gap: 0 },
  typeCardDisabled: { opacity: 0.5 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noDueBadge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 4 },
  dueDateText: { marginTop: Spacing.one },
  formCard: { gap: Spacing.three },
  input: {
    borderWidth: 2,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 18,
    minHeight: 52,
    marginTop: Spacing.one,
  },
  methodRow: { flexDirection: 'row', gap: Spacing.two },
  methodChip: { flex: 1, borderWidth: 1, borderRadius: Radius.input, paddingVertical: Spacing.two, alignItems: 'center' },
  receiptPicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.input,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
});
