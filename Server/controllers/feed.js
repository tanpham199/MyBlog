const { validationResult } = require('express-validator');
const Post = require('../models/post');

exports.getPosts = (req, res, next) => {
    res.status(200).json({
        posts: [
            {
                _id: '1',
                title: 'First Post',
                content: 'This is a post',
                imageUrl: 'images/raccoon.jpeg',
                creator: { name: 'Tân Phạm' },
                createdAt: new Date(),
            },
        ],
    });
};

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrent.');
        error.statusCode = 422;
        next(error);
    }
    const { title, content } = req.body;
    const post = new Post({
        title,
        content,
        imageUrl: 'images/raccoon.jpeg',
        creator: { name: 'Tân Phạm' },
    });
    try {
        res.status(201).json({
            message: 'Post created successfully.',
            post: await post.save(),
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
