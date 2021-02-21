const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/user');
const io = require('../socket');

const VALIDATION_ERROR_MESSAGE = 'Validation failed, entered data is incorrent.';
const FIND_POST_FAILED_MESSAGE = 'Cound not find post.';

const throwError = (statusCode, message, next) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return next(error);
};

const catchDatabaseError = (err, next) => {
    if (!err.statusCode) {
        err.statusCode = 500;
    }
    return next(err);
};

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .skip((currentPage - 1) * perPage)
            .limit(perPage)
            .sort({ createdAt: -1 })
            .populate('creator');
        res.status(200).json({ message: 'Posts fetched successfully.', posts, totalItems });
    } catch (err) {
        return catchDatabaseError(err, next);
    }
};

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.file) {
        return throwError(422, VALIDATION_ERROR_MESSAGE, next);
    }
    const { title, content } = req.body;
    const imageUrl = req.file.path.replace('\\', '/');
    const post = new Post({
        title,
        content,
        imageUrl,
        creator: req.userId,
    });
    try {
        await post.save();
        const user = await User.findById(req.userId);
        user.posts.push(post);
        await user.save();
        io.getIo().emit('posts', {
            action: 'create',
            post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
        });
        res.status(201).json({
            message: 'Post created successfully.',
            post,
            creator: { _id: user._id, name: user.name },
        });
    } catch (err) {
        return catchDatabaseError(err, next);
    }
};

exports.getPost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId).populate('creator');
        if (!post) {
            return throwError(404, FIND_POST_FAILED_MESSAGE, next);
        }
        res.status(200).json({ message: 'Post fetched successfully.', post });
    } catch (err) {
        return catchDatabaseError(err, next);
    }
};

const clearImage = (filePath) => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, (err) => err && console.log(err));
};

exports.updatePost = async (req, res, next) => {
    const { title, content } = req.body;
    const newImage = req.file;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return throwError(422, VALIDATION_ERROR_MESSAGE, next);
    }
    try {
        const post = await Post.findById(req.params.postId).populate('creator');
        if (!post) {
            return throwError(404, FIND_POST_FAILED_MESSAGE, next);
        }
        if (post.creator._id.toString() !== req.userId) {
            return throwError(403, 'Not authorized.', next);
        }
        const oldImage = post.imageUrl;
        if (newImage) {
            clearImage(oldImage);
        }
        post.title = title;
        post.imageUrl = newImage ? newImage.path.replace('\\', '/') : oldImage;
        post.content = content;
        await post.save();
        io.getIo().emit('posts', { action: 'update', post });
        res.status(200).json({ message: 'Post updated.', post });
    } catch (err) {
        return catchDatabaseError(err, next);
    }
};

exports.deletePost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return throwError(404, FIND_POST_FAILED_MESSAGE, next);
        }
        if (post.creator.toString() !== req.userId) {
            return throwError(403, 'Not authorized.', next);
        }
        clearImage(post.imageUrl);
        await post.remove();
        const user = await User.findById(req.userId);
        user.posts.pull(post._id); // pull method given by mongoose
        await user.save();
        io.getIo().emit('posts', { action: 'delete', post });
        res.status(200).json({ message: 'Post deleted.', post });
    } catch (err) {
        return catchDatabaseError(err, next);
    }
};
