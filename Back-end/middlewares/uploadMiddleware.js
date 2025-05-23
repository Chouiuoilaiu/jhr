const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');
require('dotenv').config();

// Tạo thư mục uploads nếu chưa tồn tại
const uploadDir = path.join(__dirname, '../uploads');
const tempDir = path.join(uploadDir, 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Kiểm tra cấu hình Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Cloudinary configuration is missing. Please check your .env file');
  throw new Error('Cloudinary configuration is missing');
}

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình storage cho Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'notifications',
    resource_type: 'auto',
    use_filename: true,
    unique_filename: true,
    type: 'upload',
    access_mode: 'public'
  }
});

// Cấu hình multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Giới hạn 10MB
  },
  fileFilter: function (req, file, cb) {
    // Chấp nhận cả file ảnh và PDF
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh hoặc PDF!'));
    }
  }
});

// Middleware xử lý upload và Cloudinary
const handleUpload = (req, res, next) => {
  console.log('Starting file upload process...');
  
  // Cấu hình upload fields
  const uploadFields = upload.fields([
    { name: 'personalPhoto', maxCount: 1 },
    { name: 'idCardPhotos', maxCount: 2 }
  ]);

  uploadFields(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File quá lớn. Kích thước tối đa là 10MB.' });
      }
      return res.status(400).json({ message: 'Lỗi khi upload file' });
    } else if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message });
    }

    // Log thông tin về files đã upload
    console.log('Uploaded files:', {
      personalPhoto: req.files?.personalPhoto ? req.files.personalPhoto[0] : null,
      idCardPhotos: req.files?.idCardPhotos || []
    });

    next();
  });
};

// Middleware xử lý upload CV
const handleCVUpload = (req, res, next) => {
  console.log('Starting CV upload process...');
  
  const uploadCV = upload.array('cv', 5); // Cho phép upload tối đa 5 CV

  uploadCV(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: 'Lỗi khi upload CV' });
    } else if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message });
    }

    // Log thông tin về files CV đã upload
    console.log('Uploaded CVs:', req.files);
    
    // Lưu thông tin files vào req.uploadedFiles để controller có thể sử dụng
    if (req.files && req.files.length > 0) {
      req.uploadedFiles = req.files.map(file => ({
        url: file.path,
        public_id: file.filename,
        fileName: file.originalname
      }));
    }

    next();
  });
};

module.exports = { 
  upload,
  handleUpload,
  handleCVUpload
};
