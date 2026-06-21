// src/components/layout/Footer.jsx
import * as Lucide from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-base-300 border-t border-base-300 text-base-content mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-content flex items-center justify-center">
                <Lucide.MapPin size={20} />
              </div>
              <span className="font-bold text-lg">UrbanMind</span>
            </div>
            <p className="text-xs text-base-content/70">
              Hệ thống quản lý feedback và phản ánh dịch vụ đô thị thông minh.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-wider text-base-content">Liên kết nhanh</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="link link-hover text-base-content/70 hover:text-base-content">
                  Về chúng tôi
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="link link-hover text-base-content/70 hover:text-base-content">
                  Bảng điều khiển
                </Link>
              </li>
              <li>
                <a href="#faq" className="link link-hover text-base-content/70 hover:text-base-content">
                  Câu hỏi thường gặp
                </a>
              </li>
              <li>
                <a href="#contact" className="link link-hover text-base-content/70 hover:text-base-content">
                  Liên hệ hỗ trợ
                </a>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-wider text-base-content">Tính năng</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#features" className="link link-hover text-base-content/70 hover:text-base-content">
                  Quản lý phản ánh
                </a>
              </li>
              <li>
                <a href="#features" className="link link-hover text-base-content/70 hover:text-base-content">
                  Phân tích dữ liệu
                </a>
              </li>
              <li>
                <a href="#features" className="link link-hover text-base-content/70 hover:text-base-content">
                  AI Copilot
                </a>
              </li>
              <li>
                <a href="#features" className="link link-hover text-base-content/70 hover:text-base-content">
                  Bản đồ tương tác
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-wider text-base-content">Liên hệ</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-base-content/70">
                <Lucide.Mail size={14} />
                <a href="mailto:support@urbanmind.vn" className="link link-hover">
                  support@urbanmind.vn
                </a>
              </div>
              <div className="flex items-center gap-2 text-base-content/70">
                <Lucide.Phone size={14} />
                <a href="tel:+84123456789" className="link link-hover">
                  +84 (0)123 456 789
                </a>
              </div>
              <div className="flex gap-3 mt-3">
                <a href="#" className="btn btn-ghost btn-xs btn-circle" title="Facebook">
                  <Lucide.Share2 size={16} />
                </a>
                <a href="#" className="btn btn-ghost btn-xs btn-circle" title="Twitter">
                  <Lucide.Send size={16} />
                </a>
                <a href="#" className="btn btn-ghost btn-xs btn-circle" title="LinkedIn">
                  <Lucide.Briefcase size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="divider my-6"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-base-content/60">
          <div className="flex gap-4">
            <a href="#privacy" className="link link-hover">
              Chính sách riêng tư
            </a>
            <a href="#terms" className="link link-hover">
              Điều khoản dịch vụ
            </a>
            <a href="#cookies" className="link link-hover">
              Quản lý cookies
            </a>
          </div>
          <div className="text-center md:text-right">
            <p>© {currentYear} UrbanMind. Bản quyền được bảo lưu.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
