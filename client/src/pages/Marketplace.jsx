import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import axios from 'axios';

const Marketplace = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingProductId, setProcessingProductId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/products', {
        withCredentials: true
      });

      console.log('Marketplace API Response:', response.data);
      
      if (response.data?.success) {
        // CRITICAL FIX: Access the array correctly from response.data.products
        console.log('Products array received:', response.data.products);
        setProducts(response.data.products || []);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load marketplace');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (productId) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please log in.');
        navigate('/login');
        return;
      }

      // Set processing state for this product
      setProcessingProductId(productId);

      // Call purchase API
      const response = await axios.post(
        '/api/products/buy',
        { productId },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (response.data?.success) {
        // Show success alert
        const newBalance = response.data?.newCreditBalance || 0;
        alert(`Purchase Successful! Your new credit balance: ${newBalance} Credits`);
        
        // Ask if user wants to go back to Dashboard
        const goToDashboard = window.confirm('Would you like to go back to Dashboard to see your updated credits?');
        
        if (goToDashboard) {
          navigate('/dashboard');
        }
      } else {
        throw new Error(response.data?.message || 'Purchase failed');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      
      // Show error alert
      const errorMessage = err.response?.data?.message || err.message || 'Purchase failed';
      
      if (errorMessage.includes('Insufficient') || errorMessage.includes('funds')) {
        alert('Insufficient Credits');
      } else {
        alert(errorMessage);
      }
    } finally {
      // Clear processing state
      setProcessingProductId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(cyan 1px, transparent 1px),
            linear-gradient(90deg, cyan 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl opacity-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <motion.button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-black/50 border border-cyan-500/30 rounded-lg hover:border-cyan-400 hover:bg-cyan-500/10 transition-all duration-300 font-mono text-sm mb-6"
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </motion.button>

          <div className="text-center">
            <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              MARKETPLACE
            </h1>
            <p className="text-purple-400 font-mono italic">Digital & Physical Goods</p>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-2"></div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-cyan-400 font-mono text-xl mb-4 animate-pulse">
                Loading Marketplace...
              </p>
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="max-w-md mx-auto bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-8">
            <p className="text-red-400 font-mono text-sm mb-2">✗ SYSTEM::ERROR</p>
            <p className="text-red-300 font-mono text-xs">{error}</p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400 font-mono text-sm">No items found</p>
              </div>
            ) : (
              products.map((product) => (
                <motion.div
                  key={product?.id}
                  className="bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-lg overflow-hidden hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  style={{
                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.2), inset 0 0 20px rgba(147, 51, 234, 0.1)'
                  }}
                >
                  {/* Product Image */}
                  <div className="relative h-48 bg-black/60 overflow-hidden">
                    <img
                      src={product?.image_url || 'https://via.placeholder.com/400x400/000000/00ffff?text=Product'}
                      alt={product?.name || 'Product'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x400/000000/00ffff?text=Product';
                      }}
                    />
                    {/* Type Badge */}
                    {product?.type && (
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded text-xs font-mono ${
                          product.type === 'PHYSICAL'
                            ? 'bg-purple-500/80 text-white'
                            : 'bg-cyan-500/80 text-black'
                        }`}>
                          {product.type}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-mono">
                      {product?.name || 'Unnamed Product'}
                    </h3>
                    
                    {/* Price - Clearly displayed */}
                    <div className="mt-4">
                      <p className="text-cyan-400 font-mono text-xs mb-1">PRICE</p>
                      <p className="text-white font-bold text-2xl">
                        {product?.price || 0} <span className="text-cyan-400 text-sm">Credits</span>
                      </p>
                    </div>

                    {/* Buy Button */}
                    <motion.button
                      onClick={() => handleBuy(product?.id)}
                      disabled={processingProductId === product?.id}
                      className={`w-full mt-4 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-mono font-bold rounded transition-all duration-300 ${
                        processingProductId === product?.id
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]'
                      }`}
                      whileHover={processingProductId !== product?.id ? { scale: 1.05 } : {}}
                      whileTap={processingProductId !== product?.id ? { scale: 0.95 } : {}}
                    >
                      {processingProductId === product?.id ? 'Processing...' : 'BUY'}
                    </motion.button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
