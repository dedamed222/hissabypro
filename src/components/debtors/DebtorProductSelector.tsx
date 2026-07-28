
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, Package } from "lucide-react";
import { loadStoreData } from "@/utils/localStorage";
import { formatCurrency } from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";

interface DebtorProductItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface DebtorProductSelectorProps {
  selectedProducts: DebtorProductItem[];
  onProductsChange: (products: DebtorProductItem[]) => void;
}

const DebtorProductSelector = ({ selectedProducts, onProductsChange }: DebtorProductSelectorProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const storeData = loadStoreData();
    setProducts(storeData.products || []);
  }, []);

  const filteredProducts = searchTerm.trim() === ""
    ? products
    : products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        product.code.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const handleAddProduct = () => {
    if (!selectedProduct || quantity <= 0) return;

    // Check if product has enough quantity in inventory
    if (selectedProduct.quantity < quantity) {
      toast({
        title: "تحذير",
        description: `الكمية المتاحة في المخزون: ${selectedProduct.quantity} فقط`,
        variant: "destructive"
      });
      return;
    }

    const existingIndex = selectedProducts.findIndex(
      item => item.productId === selectedProduct.id
    );

    if (existingIndex !== -1) {
      const updatedProducts = [...selectedProducts];
      const newQuantity = updatedProducts[existingIndex].quantity + quantity;
      
      // Check total quantity doesn't exceed inventory
      if (selectedProduct.quantity < newQuantity) {
        toast({
          title: "تحذير",
          description: `الكمية المتاحة في المخزون: ${selectedProduct.quantity} فقط`,
          variant: "destructive"
        });
        return;
      }
      
      updatedProducts[existingIndex].quantity = newQuantity;
      updatedProducts[existingIndex].total = updatedProducts[existingIndex].quantity * updatedProducts[existingIndex].price;
      onProductsChange(updatedProducts);
    } else {
      const newItem: DebtorProductItem = {
        productId: selectedProduct.id,
        productCode: selectedProduct.code,
        productName: selectedProduct.name,
        quantity: quantity,
        price: selectedProduct.price,
        total: quantity * selectedProduct.price
      };
      onProductsChange([...selectedProducts, newItem]);
    }

    toast({
      title: "تم بنجاح",
      description: "تمت إضافة المنتج بنجاح"
    });

    setSelectedProduct(null);
    setQuantity(1);
    setSearchTerm("");
  };

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts.splice(index, 1);
    onProductsChange(updatedProducts);
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    const updatedProducts = [...selectedProducts];
    const productItem = updatedProducts[index];
    
    // Find product in inventory to check available quantity
    const inventoryProduct = products.find(p => p.code === productItem.productCode);
    if (inventoryProduct && inventoryProduct.quantity < newQuantity) {
      toast({
        title: "تحذير",
        description: `الكمية المتاحة في المخزون: ${inventoryProduct.quantity} فقط`,
        variant: "destructive"
      });
      return;
    }
    
    updatedProducts[index].quantity = newQuantity;
    updatedProducts[index].total = newQuantity * updatedProducts[index].price;
    onProductsChange(updatedProducts);
  };

  const totalAmount = selectedProducts.reduce((sum, item) => sum + item.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          إضافة منتجات للمديون
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block mb-2 font-medium">البحث عن منتج</label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو الرمز..."
              className="focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && filteredProducts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                    onClick={() => {
                      setSelectedProduct(product);
                      setSearchTerm(product.name);
                    }}
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-600">
                      الرمز: {product.code} | السعر: {formatCurrency(product.price)}
                    </div>
                    <div className={`text-sm font-semibold ${product.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      الكمية المتاحة: {product.quantity}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block mb-2 font-medium">الكمية</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              max={selectedProduct?.quantity || undefined}
              className="focus:ring-2 focus:ring-blue-500"
            />
            {selectedProduct && (
              <p className={`text-sm mt-1 ${selectedProduct.quantity > 10 ? 'text-green-600' : selectedProduct.quantity > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                متاح في المخزون: {selectedProduct.quantity} وحدة
              </p>
            )}
          </div>
        </div>

        <Button 
          onClick={handleAddProduct} 
          disabled={!selectedProduct}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          إضافة منتج
        </Button>

        {/* Selected Products List */}
        {selectedProducts.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-3">المنتجات المحددة</h4>
            <div className="space-y-2">
              {selectedProducts.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm text-gray-600">الرمز: {item.productCode}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuantityChange(index, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuantityChange(index, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <div className="ml-4 font-medium text-green-600">
                      {formatCurrency(item.total)}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveProduct(index)}
                    >
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">المجموع الكلي:</span>
                <span className="text-xl font-bold text-blue-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DebtorProductSelector;
