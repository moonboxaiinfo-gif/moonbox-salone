import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Building, 
  CheckCircle2, 
  User, 
  Scissors, 
  Boxes, 
  Receipt,
  Percent,
  Sparkles,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { 
  Customer,
  Service, 
  Product, 
  Staff, 
  CartItem, 
  Invoice, 
  PaymentMethod,
  Appointment 
} from '../../types';
import { StorageService } from '../../services/storageService';
import { formatLKR } from '../../constants/brand';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { invalidateTenantData, useTenantCatalog, useTenantCustomers, useTenantProducts, useTenantStaff } from '../../services/asyncDataService';
import { InvoiceViewModal } from '../invoices/InvoiceViewModal';

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('94') ? `0${digits.slice(2)}` : digits;
};

interface POSRegisterProps {
  tenantId: string;
  preloadedAppointment?: Appointment | null;
  onClearPreloadedAppointment?: () => void;
  onInvoiceCreated?: (invoice: Invoice) => void;
}

export const POSRegister: React.FC<POSRegisterProps> = ({
  tenantId,
  preloadedAppointment,
  onClearPreloadedAppointment,
  onInvoiceCreated
}) => {
  const { currentUser } = useAuth();
  const { tenant } = useTenant();
  const canApplyDiscount = ['owner', 'manager', 'superadmin'].includes(currentUser?.role || '');
  const [activeCatalogTab, setActiveCatalogTab] = useState<'all' | 'services' | 'products'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  
  // Data lists
  const customerResource = useTenantCustomers(tenantId);
  const catalogResource = useTenantCatalog(tenantId);
  const productsResource = useTenantProducts(tenantId);
  const staffResource = useTenantStaff(tenantId);
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);
  const customers = [...(customerResource.data || [])];
  if (createdCustomer && !customers.some(customer => customer.id === createdCustomer.id)) customers.unshift(createdCustomer);
  const services = (catalogResource.data?.services || []).filter(s => s.isActive);
  const products = (productsResource.data || []).filter(p => p.status === 'active');
  const staffList = (staffResource.data || []).filter(s => s.status === 'active');

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(tenant?.settings?.taxRate || 0);
  const [tipLKR, setTipLKR] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cashReceivedLKR, setCashReceivedLKR] = useState<number>(0);
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Completed Invoice Modal state
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const checkoutSubmitted = useRef(false);

  useEffect(() => {
    if (!selectedCustomerId && customers.length) setSelectedCustomerId(customers[0].id);
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    setTaxPercent(tenant?.settings?.taxRate || 0);
  }, [tenant?.id, tenant?.settings?.taxRate]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedCustomerSearch(customerSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [customerSearch]);

  const normalizedCustomerQuery = debouncedCustomerSearch.toLocaleLowerCase();
  const normalizedCustomerPhoneQuery = normalizePhone(debouncedCustomerSearch);
  const matchingCustomers = customers.filter(customer => {
    if (!normalizedCustomerQuery) return true;
    const nameMatches = customer.name.toLocaleLowerCase().includes(normalizedCustomerQuery);
    const phoneMatches = normalizedCustomerPhoneQuery.length > 0 && normalizePhone(customer.phone).includes(normalizedCustomerPhoneQuery);
    return nameMatches || phoneMatches;
  }).slice(0, 8);

  const createCustomerFromPOS = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCustomerError(null);
    const cleanName = newCustomerName.trim();
    const cleanPhone = newCustomerPhone.trim();
    const phoneDigits = normalizePhone(cleanPhone);
    if (savingCustomer) return;
    if (!cleanName || phoneDigits.length < 7) {
      setCustomerError('Enter a customer name and a valid phone number.');
      return;
    }
    const duplicate = customers.find(customer => normalizePhone(customer.phone) === phoneDigits);
    if (duplicate) {
      setCustomerError(`A customer with this phone already exists: ${duplicate.name}.`);
      setSelectedCustomerId(duplicate.id);
      return;
    }
    const customer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenantId,
      name: cleanName,
      phone: cleanPhone,
      email: newCustomerEmail.trim() || undefined,
      address: newCustomerAddress.trim() || undefined,
      status: 'active',
      totalSpentLKR: 0,
      visitsCount: 0,
      createdAt: new Date().toISOString()
    };
    setSavingCustomer(true);
    try {
      const savedCustomer = await StorageService.saveCustomerConfirmed(customer);
      setCreatedCustomer(savedCustomer);
      invalidateTenantData(tenantId);
      setSelectedCustomerId(savedCustomer.id);
      setCustomerSearch(`${savedCustomer.name} · ${savedCustomer.phone}`);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setNewCustomerAddress('');
      setIsCreatingCustomer(false);
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : 'Could not save customer. Please try again.');
    } finally {
      setSavingCustomer(false);
    }
  };

  // Preload appointment if triggered from Appointment Calendar
  useEffect(() => {
    if (preloadedAppointment) {
      checkoutSubmitted.current = false;
      setSelectedCustomerId(preloadedAppointment.customerId);
      const itemsToAdd: CartItem[] = [];
      
      for (const srvId of preloadedAppointment.serviceIds) {
        const srv = services.find(s => s.id === srvId);
        if (srv) {
          itemsToAdd.push({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            type: 'service',
            itemId: srv.id,
            name: srv.name,
            unitPriceLKR: srv.priceLKR,
            quantity: 1,
            staffId: preloadedAppointment.staffId,
            staffName: preloadedAppointment.staffName
          });
        }
      }
      setCartItems(itemsToAdd);
      if (onClearPreloadedAppointment) onClearPreloadedAppointment();
    }
  }, [preloadedAppointment]);

  // Cart calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (item.unitPriceLKR * item.quantity), 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round((afterDiscount * taxPercent) / 100);
  const totalAmount = afterDiscount + taxAmount + tipLKR;

  // Add service to cart
  const addServiceToCart = (service: Service) => {
    checkoutSubmitted.current = false;
    setIsCheckingOut(false);
    setErrorMsg(null);
    const defaultStaff = staffList[0];
    const newItem: CartItem = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: 'service',
      itemId: service.id,
      name: service.name,
      unitPriceLKR: service.priceLKR,
      quantity: 1,
      staffId: defaultStaff?.id,
      staffName: defaultStaff?.name
    };
    setCartItems([...cartItems, newItem]);
  };

  // Add product to cart (checks available stock)
  const addProductToCart = (product: Product) => {
    checkoutSubmitted.current = false;
    setIsCheckingOut(false);
    setErrorMsg(null);
    if (product.stockQuantity <= 0) {
      setErrorMsg(`Product "${product.name}" is out of stock!`);
      return;
    }

    const existingIndex = cartItems.findIndex(i => i.type === 'product' && i.itemId === product.id);
    if (existingIndex >= 0) {
      const existing = cartItems[existingIndex];
      if (existing.quantity + 1 > product.stockQuantity) {
        setErrorMsg(`Cannot add more. Only ${product.stockQuantity} units available.`);
        return;
      }
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      const defaultStaff = staffList[0];
      const newItem: CartItem = {
        id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'product',
        itemId: product.id,
        name: product.name,
        unitPriceLKR: product.sellingPriceLKR,
        quantity: 1,
        staffId: defaultStaff?.id,
        staffName: defaultStaff?.name
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const updateQuantity = (cartItemId: string, change: number) => {
    checkoutSubmitted.current = false;
    setIsCheckingOut(false);
    setErrorMsg(null);
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === cartItemId) {
          const newQ = item.quantity + change;
          if (newQ <= 0) return null;
          if (item.type === 'product') {
            const prod = products.find(p => p.id === item.itemId);
            if (prod && newQ > prod.stockQuantity) {
              setErrorMsg(`Stock limit reached (${prod.stockQuantity} available).`);
              return item;
            }
          }
          return { ...item, quantity: newQ };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const updateItemStaff = (cartItemId: string, staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    setCartItems(prev => prev.map(item => {
      if (item.id === cartItemId) {
        return {
          ...item,
          staffId,
          staffName: staff?.name || 'Staff'
        };
      }
      return item;
    }));
  };

  const removeItem = (cartItemId: string) => {
    checkoutSubmitted.current = false;
    setIsCheckingOut(false);
    setCartItems(prev => prev.filter(i => i.id !== cartItemId));
  };

  const handleCheckout = async () => {
    setErrorMsg(null);
    if (checkoutSubmitted.current || isCheckingOut) return;
    if (cartItems.length === 0) {
      setErrorMsg('Please add at least one service or product to the bill.');
      return;
    }
    if (paymentMethod === 'cash' && cashReceivedLKR > 0 && cashReceivedLKR < totalAmount) {
      setErrorMsg('Cash received must be at least the sale total.');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId) || {
      id: 'cust_walkin',
      name: 'Walk-in Client',
      phone: ''
    };

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      tenantId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: cartItems.map(item => ({
        type: item.type,
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
        unitPriceLKR: item.unitPriceLKR,
        discountLKR: 0,
        totalLKR: item.unitPriceLKR * item.quantity,
        staffId: item.staffId,
        staffName: item.staffName
      })),
      discountPercent,
      subtotalLKR: subtotal,
      discountLKR: discountAmount,
      taxLKR: taxAmount,
      tipLKR: tipLKR,
      totalLKR: totalAmount,
      paidAmountLKR: totalAmount,
      cashReceivedLKR: paymentMethod === 'cash' ? (cashReceivedLKR || totalAmount) : undefined,
      balanceLKR: 0,
      paymentMethod,
      status: 'paid',
      notes: checkoutNotes,
      createdBy: currentUser?.name || 'Reception Desk',
      createdAt: new Date().toISOString()
    };

    checkoutSubmitted.current = true;
    setIsCheckingOut(true);
    const res = await StorageService.createInvoiceConfirmed(newInvoice).catch((error) => ({ success: false, invoice: undefined, error: error instanceof Error ? error.message : 'Database transaction failed.' }));
    if (!res.success) {
      checkoutSubmitted.current = false;
      setIsCheckingOut(false);
      setErrorMsg(res.error || 'Failed to process checkout transaction.');
      return;
    }
    invalidateTenantData(tenantId);

    // Reset cart and open receipt modal
    setCartItems([]);
    setDiscountPercent(0);
    setTipLKR(0);
    setCashReceivedLKR(0);
    setCheckoutNotes('');
    setCompletedInvoice(res.invoice || newInvoice);
    setIsCheckingOut(false);

    if (onInvoiceCreated) {
      onInvoiceCreated(res.invoice || newInvoice);
    }
  };

  // Filter Catalog items
  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: Catalog Picker (7 Cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Search & Category Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8DFD6] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search services or retail products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#9B3E88]"
              />
            </div>

            {/* Segmented Controls */}
            <div className="flex bg-[#FAF8F5] p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActiveCatalogTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeCatalogTab === 'all' ? 'bg-[#1B0C2D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                onClick={() => setActiveCatalogTab('services')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeCatalogTab === 'services' ? 'bg-[#1B0C2D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Services
              </button>
              <button
                onClick={() => setActiveCatalogTab('products')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeCatalogTab === 'products' ? 'bg-[#1B0C2D] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Products
              </button>
            </div>
          </div>
        </div>

        {(catalogResource.loading || productsResource.loading || staffResource.loading) && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">Loading services, products, and staff…</div>}
        {(catalogResource.error || productsResource.error || staffResource.error) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"><p>{catalogResource.error || productsResource.error || staffResource.error}</p><button onClick={() => { catalogResource.retry(); productsResource.retry(); staffResource.retry(); }} className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-bold">Retry catalog</button></div>}

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
          {/* Services */}
          {(activeCatalogTab === 'all' || activeCatalogTab === 'services') && (
            filteredServices.map(srv => (
              <div
                key={srv.id}
                onClick={() => addServiceToCart(srv)}
                className="p-3.5 rounded-2xl bg-white border border-[#E8DFD6] hover:border-[#9B3E88] shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] font-bold text-[#9B3E88] uppercase tracking-wider">
                      Service · {srv.durationMinutes}m
                    </span>
                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-[#9B3E88] transition-colors" />
                  </div>
                  <h4 className="text-xs font-bold text-[#1B0C2D] mt-1 line-clamp-1">{srv.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                    {srv.description || 'Premium salon treatment'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1B0C2D]">{formatLKR(srv.priceLKR)}</span>
                  <span className="text-[10px] font-semibold text-[#DE9E74] bg-[#DE9E74]/10 px-1.5 py-0.5 rounded">
                    + Add to Cart
                  </span>
                </div>
              </div>
            ))
          )}

          {/* Products */}
          {(activeCatalogTab === 'all' || activeCatalogTab === 'products') && (
            filteredProducts.map(prod => (
              <div
                key={prod.id}
                onClick={() => addProductToCart(prod)}
                className={`p-3.5 rounded-2xl bg-white border shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.98] ${
                  prod.stockQuantity <= 0 ? 'opacity-50 pointer-events-none border-slate-200' : 'border-[#E8DFD6] hover:border-[#DE9E74]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                      Retail SKU: {prod.sku}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      prod.stockQuantity <= prod.lowStockThreshold ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {prod.stockQuantity} in stock
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#1B0C2D] mt-1 line-clamp-1">{prod.name}</h4>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1B0C2D]">{formatLKR(prod.sellingPriceLKR)}</span>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    + Add to Cart
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Cart & Checkout Register (5 Cols) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8DFD6] shadow-sm flex flex-col h-full">
        {/* Cart Header */}
        <div className="p-4 bg-[#FAF8F5] border-b border-[#E8DFD6] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1B0C2D] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#9B3E88]" />
              <span>Current Register Bill</span>
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
              {cartItems.length} items
            </span>
          </div>

          {/* Customer Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Billing Client</label>
            <div className="flex gap-2">
              <input
                type="search"
                value={customerSearch}
                onChange={event => setCustomerSearch(event.target.value)}
                placeholder="Search name or phone number…"
                aria-label="Search customers by name or phone"
                className="min-w-0 flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#9B3E88]"
              />
              <button type="button" onClick={() => { setIsCreatingCustomer(open => !open); setCustomerError(null); }} className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-[#9B3E88]/25 px-3 py-2 text-xs font-semibold text-[#9B3E88] hover:bg-purple-50" aria-label="Create new customer">
                <UserPlus className="w-4 h-4" /><span className="hidden sm:inline">New</span>
              </button>
            </div>
            <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-slate-100 bg-white">
              {customerResource.loading && <p role="status" className="px-3 py-2 text-xs text-slate-500">Loading customers…</p>}
              {customerResource.error && <div role="alert" className="px-3 py-2 text-xs text-rose-700"><p>{customerResource.error}</p><button onClick={customerResource.retry} className="mt-1 underline">Retry</button></div>}
              <button type="button" onClick={() => { setSelectedCustomerId('cust_walkin'); setCustomerSearch(''); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${selectedCustomerId === 'cust_walkin' ? 'font-bold text-[#9B3E88]' : 'text-slate-600'}`}>
                Walk-in Client · no CRM profile
              </button>
              {matchingCustomers.map(customer => (
                <button key={customer.id} type="button" onClick={() => { setSelectedCustomerId(customer.id); setCustomerSearch(`${customer.name} · ${customer.phone}`); }} className={`w-full text-left px-3 py-2 border-t border-slate-100 hover:bg-purple-50 ${selectedCustomerId === customer.id ? 'bg-purple-50' : ''}`}>
                  <span className="block text-xs font-semibold text-slate-800">{customer.name}</span>
                  <span className="block text-[11px] text-slate-500">{customer.phone}</span>
                </button>
              ))}
              {!customerResource.loading && !customerResource.error && normalizedCustomerQuery && matchingCustomers.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">No matching customers in this salon.</p>}
            </div>
            {selectedCustomerId !== 'cust_walkin' && (() => {
              const selectedCustomer = customers.find(customer => customer.id === selectedCustomerId);
              return selectedCustomer ? <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs"><span className="font-medium text-emerald-800">Selected: {selectedCustomer.name} · {selectedCustomer.phone}</span><button type="button" onClick={() => { setSelectedCustomerId('cust_walkin'); setCustomerSearch(''); }} className="font-semibold text-emerald-800 underline">Remove</button></div> : null;
            })()}
            {isCreatingCustomer && <form onSubmit={createCustomerFromPOS} className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-xs font-bold text-slate-700">Create customer</p>
              <input required value={newCustomerName} onChange={event => setNewCustomerName(event.target.value)} placeholder="Customer name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
              <input required type="tel" value={newCustomerPhone} onChange={event => setNewCustomerPhone(event.target.value)} placeholder="Phone number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
              <input type="email" value={newCustomerEmail} onChange={event => setNewCustomerEmail(event.target.value)} placeholder="Email (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
              <input value={newCustomerAddress} onChange={event => setNewCustomerAddress(event.target.value)} placeholder="Address (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
              {customerError && <p role="alert" className="text-xs text-rose-700">{customerError}</p>}
              <div className="flex justify-end gap-2"><button type="button" disabled={savingCustomer} onClick={() => setIsCreatingCustomer(false)} className="rounded-lg px-3 py-2 text-xs text-slate-600 disabled:opacity-50">Cancel</button><button type="submit" disabled={savingCustomer || customerResource.loading || Boolean(customerResource.error)} className="rounded-lg bg-[#1B0C2D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingCustomer ? 'Saving…' : 'Save & select'}</button></div>
            </form>}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="m-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100 min-h-[180px]">
          {cartItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#9B3E88]" />
              <p className="text-xs font-semibold">Your register cart is empty</p>
              <p className="text-[11px] mt-0.5">Click services or products from catalog to add.</p>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="pt-2.5 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        item.type === 'service' ? 'bg-purple-100 text-[#9B3E88]' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.type}
                      </span>
                      <h5 className="text-xs font-bold text-[#1B0C2D] line-clamp-1">{item.name}</h5>
                    </div>

                    {/* Staff selection for commission attribution */}
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                      <span>Stylist:</span>
                      <select
                        value={item.staffId || ''}
                        onChange={e => updateItemStaff(item.id, e.target.value)}
                        className="bg-transparent text-slate-700 font-medium text-[11px] underline focus:outline-none"
                      >
                        {staffList.map(st => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#1B0C2D]">
                    {formatLKR(item.unitPriceLKR * item.quantity)}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculation & Adjustments */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#E8DFD6] space-y-2.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-800">{formatLKR(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1">
              <span>Discount</span>
              <span className="text-[10px] text-slate-400">(%)</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                disabled={!canApplyDiscount}
                title={canApplyDiscount ? 'Manager discount' : 'Owner or manager permission is required to apply a discount'}
                className="w-14 px-2 py-0.5 rounded border border-slate-200 text-right font-bold text-xs"
              />
              <span className="text-slate-500 font-medium">-{formatLKR(discountAmount)}</span>
            </div>
          </div>
          {!canApplyDiscount && <p className="text-[10px] text-slate-400">Discounts require owner or manager permission.</p>}

          {taxPercent > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Tax ({taxPercent}%)</span>
              <span className="font-semibold text-slate-800">+{formatLKR(taxAmount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Gratuity / Tip (Rs.)</span>
            <input
              type="number"
              min="0"
              value={tipLKR}
              onChange={e => setTipLKR(Math.max(0, Number(e.target.value)))}
              className="w-20 px-2 py-0.5 rounded border border-slate-200 text-right font-bold text-xs"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
            <span className="text-sm font-bold text-[#1B0C2D]">Net Total</span>
            <span className="text-lg font-extrabold text-[#1B0C2D] tracking-tight">
              {formatLKR(totalAmount)}
            </span>
          </div>

          {paymentMethod === 'cash' && (
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="cash-received" className="text-slate-600">Cash received</label>
              <input id="cash-received" type="number" min={totalAmount} value={cashReceivedLKR || totalAmount} onChange={event => setCashReceivedLKR(Math.max(0, Number(event.target.value)))} className="w-28 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs font-semibold" />
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="pt-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              Settlement Payment Method
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'digital_qr', label: 'QR', icon: QrCode },
                { id: 'bank_transfer', label: 'Bank', icon: Building },
              ].map(m => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${
                      isSelected
                        ? 'bg-[#1B0C2D] border-[#1B0C2D] text-[#F3C9AB] font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cartItems.length === 0 || isCheckingOut || customerResource.loading || catalogResource.loading || staffResource.loading || Boolean(customerResource.error || catalogResource.error || staffResource.error)}
            className={`w-full mt-3 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
              cartItems.length === 0 || isCheckingOut || customerResource.loading || catalogResource.loading || staffResource.loading || Boolean(customerResource.error || catalogResource.error || staffResource.error)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] active:scale-98'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-[#DE9E74]" />
            <span>{isCheckingOut ? 'Saving sale…' : `Complete Sale & Issue Invoice (${formatLKR(totalAmount)})`}</span>
          </button>
        </div>
      </div>

      {/* Completed Invoice Printable Modal */}
      {completedInvoice && (
        <InvoiceViewModal
          isOpen={true}
          onClose={() => setCompletedInvoice(null)}
          invoice={completedInvoice}
          tenant={tenant}
        />
      )}
    </div>
  );
};
