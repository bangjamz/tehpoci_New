import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { CheckCircle, Printer, X, ShoppingBag } from 'lucide-react'
import { formatRupiah } from '../../utils/currency'

function Receipt({ transaction, forwardRef }) {
  const { items, totalAmount, paymentMethod, cashPaid, change, cashierName, timestamp } = transaction
  const date = timestamp ? new Date(timestamp) : new Date()

  return (
    <div ref={forwardRef} id="receipt-print-area" className="hidden print:block font-mono text-xs w-[80mm]">
      <div className="text-center mb-2">
        <p className="font-bold text-base">TEH POCI</p>
        <p>Cabang Utama</p>
        <p>{date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <p>{date.toLocaleTimeString('id-ID')}</p>
        <p>Kasir: {cashierName}</p>
      </div>
      <p>{'─'.repeat(32)}</p>
      {items.map((item, i) => (
        <div key={i}>
          <p>{item.name}</p>
          <div className="flex justify-between">
            <span>  {item.qty}x {formatRupiah(item.price)}</span>
            <span>{formatRupiah(item.price * item.qty)}</span>
          </div>
        </div>
      ))}
      <p>{'─'.repeat(32)}</p>
      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>{formatRupiah(totalAmount)}</span>
      </div>
      <div className="flex justify-between">
        <span>{paymentMethod}</span>
        <span>{formatRupiah(cashPaid)}</span>
      </div>
      {paymentMethod === 'CASH' && (
        <div className="flex justify-between">
          <span>Kembali</span>
          <span>{formatRupiah(change)}</span>
        </div>
      )}
      <p>{'─'.repeat(32)}</p>
      <div className="text-center mt-1">
        <p>Terima kasih!</p>
        <p>Semoga harimu menyenangkan ☀</p>
      </div>
    </div>
  )
}

export default function ReceiptModal({ transaction, onClose, onNewOrder }) {
  const printRef = useRef()

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Struk-${Date.now()}`,
  })

  const date = transaction.timestamp ? new Date(transaction.timestamp) : new Date()

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-end sm:items-center justify-center">
      {/* Hidden print area */}
      <Receipt transaction={transaction} forwardRef={printRef} />

      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="p-6">
          {/* Success header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-3">
              <CheckCircle className="text-green-500" size={32} />
            </div>
            <h2 className="font-bold text-slate-900 text-lg">Transaksi Berhasil!</h2>
            <p className="text-slate-500 text-sm">
              {date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} · {date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Summary */}
          <div className="bg-brand-light rounded-2xl p-4 mb-4">
            <div className="space-y-2">
              {transaction.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600">{item.name} x{item.qty}</span>
                  <span className="font-medium">{formatRupiah(item.price * item.qty)}</span>
                </div>
              ))}
              <hr className="border-slate-200" />
              <div className="flex justify-between font-bold text-brand-green">
                <span>Total</span>
                <span>{formatRupiah(transaction.totalAmount)}</span>
              </div>
              {transaction.paymentMethod === 'CASH' && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Kembalian</span>
                  <span>{formatRupiah(transaction.change)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-500">
                <span>Metode</span>
                <span className="font-medium">{transaction.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 flex-1 touch-target border-2 border-brand-green text-brand-green font-semibold rounded-xl py-3 active:scale-95 transition-all"
            >
              <Printer size={18} />
              Cetak Struk
            </button>
            <button
              onClick={onNewOrder}
              className="flex items-center justify-center gap-2 flex-1 touch-target bg-brand-green text-white font-bold rounded-xl py-3 active:scale-95 transition-all"
            >
              <ShoppingBag size={18} />
              Pesanan Baru
            </button>
          </div>
        </div>
        <div className="safe-bottom" />
      </div>
    </div>
  )
}
