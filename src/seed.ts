import { collection, addDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export const seedData = async () => {
  try {
    // Check if we already have vendors
    const vendorsSnap = await getDocs(collection(db, 'vendors'));
    if (!vendorsSnap.empty) return;

    // Add a sample vendor
    const vendorRef = await addDoc(collection(db, 'vendors'), {
      name: "Campus Bites",
      description: "Fresh sandwiches and salads made daily for students.",
      logo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000",
      location: "Student Union, Ground Floor",
      operatingHours: "8:00 AM - 4:00 PM",
      phone: "+267 71234567",
      email: "bites@campus.edu",
      status: "approved",
      ownerId: "system",
      createdAt: Timestamp.now()
    });

    // Add menu items for the vendor
    await addDoc(collection(db, `vendors/${vendorRef.id}/menuItems`), {
      name: "Chicken Mayo Sandwich",
      price: 35,
      description: "Grilled chicken with creamy mayo on wholewheat bread.",
      photo: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=500",
      vendorId: vendorRef.id,
      createdAt: Timestamp.now()
    });

    await addDoc(collection(db, `vendors/${vendorRef.id}/menuItems`), {
      name: "Greek Salad",
      price: 45,
      description: "Fresh cucumbers, tomatoes, olives, and feta cheese.",
      photo: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=500",
      vendorId: vendorRef.id,
      createdAt: Timestamp.now()
    });

    // Add sample listings
    await addDoc(collection(db, 'listings'), {
      title: "Calculus Textbook (10th Edition)",
      description: "Slightly used, no highlights. Perfect for MAT101.",
      price: 250,
      category: "Books",
      condition: "used",
      photos: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=500"],
      location: "Main Library",
      coordinates: { lat: -24.658, lng: 25.912 },
      sellerId: "system",
      sellerName: "System Admin",
      status: "available",
      createdAt: Timestamp.now()
    });

    await addDoc(collection(db, 'listings'), {
      title: "Noise Cancelling Headphones",
      description: "Sony WH-1000XM4. Great for studying in noisy dorms.",
      price: 1800,
      category: "Electronics",
      condition: "used",
      photos: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=500"],
      location: "Dorm Block A",
      coordinates: { lat: -24.660, lng: 25.915 },
      sellerId: "system",
      sellerName: "System Admin",
      status: "available",
      createdAt: Timestamp.now()
    });

    console.log("Seed data added successfully!");
  } catch (error) {
    console.error("Error seeding data:", error);
  }
};
