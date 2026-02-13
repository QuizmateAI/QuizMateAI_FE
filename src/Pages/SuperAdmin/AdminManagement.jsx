import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit, Search } from 'lucide-react';
import { createAdmin } from '../../api/AdminAPI';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDarkMode } from '@/hooks/useDarkMode'; // Giả sử em dùng hook này như các file trước

const initialAdmins = [
  { id: 1, username: 'admin_one', email: 'admin1@quizmate.ai', status: 'Active', lastLogin: '2023-10-25' },
  { id: 2, username: 'admin_two', email: 'admin2@quizmate.ai', status: 'Inactive', lastLogin: '2023-09-15' },
];

function AdminManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [admins, setAdmins] = useState(initialAdmins);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAdmin(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateAdmin = async () => {
    if (newAdmin.password !== newAdmin.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    try {
      const response = await createAdmin(newAdmin);
      if (response && response.data) {
        const createdAdmin = response.data.data;
        if (createdAdmin) {
            setAdmins([{
                id: createdAdmin.id,
                username: createdAdmin.username,
                email: createdAdmin.email,
                status: createdAdmin.status || 'Active',
                lastLogin: 'Never'
            }, ...admins]);
        }
        
        setIsDialogOpen(false);
        setNewAdmin({ username: '', email: '', password: '', confirmPassword: '', fullName: '' });
        alert(t('adminManagement.form.success'));
      }
    } catch (error) {
      console.error("Failed to create admin:", error);
      alert(t('adminManagement.form.error'));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this admin?")) {
      setAdmins(admins.filter(admin => admin.id !== id));
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('adminManagement.title')}
          </h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} font-medium`}>
            {t('adminManagement.desc')}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 h-12 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95">
              <Plus className="w-5 h-5 mr-2" />
              {t('adminManagement.add')}
            </Button>
          </DialogTrigger>
          <DialogContent className={`sm:max-w-[425px] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white'}`}>
            <DialogHeader>
              <DialogTitle>{t('adminManagement.form.title')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">{t('adminManagement.form.username')}</Label>
                <Input id="username" name="username" value={newAdmin.username} onChange={handleInputChange} className={isDarkMode ? 'bg-slate-800 border-slate-700 placeholder:text-slate-500' : ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fullName">{t('adminManagement.form.fullName')}</Label>
                <Input id="fullName" name="fullName" value={newAdmin.fullName} onChange={handleInputChange} className={isDarkMode ? 'bg-slate-800 border-slate-700 placeholder:text-slate-500' : ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t('adminManagement.form.email')}</Label>
                <Input id="email" name="email" type="email" value={newAdmin.email} onChange={handleInputChange} className={isDarkMode ? 'bg-slate-800 border-slate-700 placeholder:text-slate-500' : ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t('adminManagement.form.password')}</Label>
                <Input id="password" name="password" type="password" value={newAdmin.password} onChange={handleInputChange} className={isDarkMode ? 'bg-slate-800 border-slate-700 placeholder:text-slate-500' : ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">{t('adminManagement.form.confirmPassword')}</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" value={newAdmin.confirmPassword} onChange={handleInputChange} className={isDarkMode ? 'bg-slate-800 border-slate-700 placeholder:text-slate-500' : ''} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('adminManagement.form.cancel')}</Button>
              <Button onClick={handleCreateAdmin}>{t('adminManagement.form.submit')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table Card */}
      <Card className={`border shadow-sm overflow-hidden rounded-[24px] transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {t('adminManagement.cardTitle')}
          </CardTitle>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder={t('adminManagement.searchPlaceholder')} 
              className={`pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 ${
                isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-900'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0"> {/* Remove padding to let table stretch to edges */}
          <div className="overflow-x-auto">
            <Table className="table-auto min-w-full text-left">
              <TableHeader className={`${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}`}>
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="w-[80px] font-bold text-slate-500">{t('adminManagement.table.id')}</TableHead>
                  <TableHead className="w-[180px] font-bold text-slate-500">{t('adminManagement.table.username')}</TableHead>
                  <TableHead className="font-bold text-slate-500">{t('adminManagement.table.email')}</TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-500">{t('adminManagement.table.status')}</TableHead>
                  <TableHead className="w-[150px] font-bold text-slate-500">{t('adminManagement.table.lastLogin')}</TableHead>
                  <TableHead className="text-right w-[120px] font-bold text-slate-500">{t('adminManagement.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-bold text-blue-600 dark:text-blue-400">{admin.id}</TableCell>
                    <TableCell className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{admin.username}</TableCell>
                    <TableCell className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>{admin.email}</TableCell>
                    <TableCell>
                      <Badge className={`rounded-lg px-2.5 py-0.5 border-none ${
                        (admin.status === 'Active' || admin.status === 'ACTIVE')
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {admin.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{admin.lastLogin}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-lg hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        onClick={() => handleDelete(admin.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredAdmins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-medium italic">
                      {t('adminManagement.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminManagement;