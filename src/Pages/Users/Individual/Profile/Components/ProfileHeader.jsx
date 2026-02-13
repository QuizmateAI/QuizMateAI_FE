import React from "react";
import LogoLight from "@/assets/LightMode_Logo.png";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";

function ProfileHeader() {
  return (
    <header className="bg-[#F0F4F9] h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-200 rounded-full">
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <img src={LogoLight} alt="Logo" className="h-5 w-auto object-contain" />
          <span className="text-xl font-medium text-gray-600">Tài khoản</span>
        </div>
      </div>

      {/* Search Bar (Ẩn trên mobile nhỏ)
      <div className="hidden md:flex bg-white items-center rounded-lg px-4 h-12 w-[600px] shadow-sm">
        <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Tìm trong Tài khoản Google"
          className="flex-1 outline-none text-base bg-transparent"
        />
      </div> */}

      <div className="flex items-center gap-2">
        <UserProfilePopover />
      </div>
    </header>
  );
}

export default ProfileHeader;
