const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const Post = require('../models/post');

const VALIDATION_ERROR_MESSAGE = 'Validation failed, entered data is incorrent.';
const FIND_POST_FAILED_MESSAGE = 'Cound not find post.';

const throwError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return next(error);
};

const catchDatabaseError = (err) => {
    if (!err.statusCode) {
        err.statusCode = 500;
    }
    return next(err);
};

exports.getPosts = async (req, res, next) => {
    try {
        const posts = await Post.find();
        res.status(200).json({ message: 'Posts fetched successfully.', posts });
    } catch (err) {
        catchDatabaseError(err);
    }
};

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.file) {
        return throwError(422, VALIDATION_ERROR_MESSAGE);
    }
    const { title, content } = req.body;
    const imageUrl = req.file.path.replace('\\', '/');
    const post = new Post({
        title,
        content,
        imageUrl,
        creator: { name: 'Tân Phạm' },
    });
    try {
        await post.save();
        res.status(201).json({ message: 'Post created successfully.', post });
    } catch (err) {
        catchDatabaseError(err);
    }
};

exports.getPost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return throwError(404, FIND_POST_FAILED_MESSAGE);
        }
        res.status(200).json({ message: 'Post fetched', post });
    } catch (err) {
        catchDatabaseError(err);
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
        return throwError(422, VALIDATION_ERROR_MESSAGE);
    }
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return throwError(404, FIND_POST_FAILED_MESSAGE);
        }
        const oldImage = post.imageUrl;
        if (newImage) {
            clearImage(oldImage);
        }
        post.title = title;
        post.imageUrl = newImage ? newImage.path.replace('\\', '/') : oldImage;
        post.content = content;
        await post.save();
        res.status(200).json({ message: 'Post updated.', post });
    } catch (err) {
        catchDatabaseError(err);
    }
};

exports.deletePost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return throwError(404, FIND_POST_FAILED_MESSAGE);
        }
        clearImage(post.imageUrl);
        await post.remove();
        res.status(200).json({ message: 'Post deleted.', post });
    } catch (err) {
        catchDatabaseError(err);
    }
};
