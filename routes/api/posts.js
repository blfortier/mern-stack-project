const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");

// Bring in the Post model
const Post = require("../../models/Post");

// Bring in the Profile model
const Profile = require("../../models/Profile");

// Validation
const validatePostInput = require("../../validation/post");

// @route     GET api/posts/test
// @dsc       Tests post route
// @access    Public
router.get("/test", (req, res) => res.json({ message: "Posts Route Works" }));

// @route     GET api/posts
// @dsc       Get posts
// @access    Public
router.get("/", (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then(posts => res.json(posts))
    .catch(err => res.status(404).json({ nopostsfound: "No posts found" }));
});

// @route     GET api/posts/:id
// @dsc       Get post by id
// @access    Public
router.get("/:id", (req, res) => {
  Post.findById(req.params.id)
    .then(post => {
      if (post) {
        res.json(post);
      } else {
        res.status(404).json({ nopostfound: "No post found with that ID" });
      }
    })
    .catch(err =>
      res.status(404).json({ nopostfound: "No post found with that ID" })
    );
});

// @route     POST api/posts
// @dsc       Create post
// @access    Private
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    // Check validation
    if (!isValid) {
      // If any errors, send 400 with errors object
      return res.status(400).json(errors);
    }

    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    });

    newPost.save().then(post => res.json(post));
  }
);

// @route     DELETE api/posts/:id
// @dsc       Delete post
// @access    Private
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id)
        .then(post => {
          // Check for post owner
          if (post.user.toString() !== req.user.id) {
            return res
              .status(401)
              .json({ notauthorized: "User not authorized" });
          }

          // Delete
          post.remove().then(() => res.json({ success: true }));
        })
        .catch(err => res.status(404).json({ postnotfound: "No post found" }));
    });
  }
);

// @route     POST api/posts/like/:id
// @dsc       Like post
// @access    Private
router.post(
  "/like/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id)
        .then(post => {
          // Check for post owner
          if (
            post.likes.filter(like => like.user.toString() === req.user.id)
              .length > 0) {
            return res.status(400).json({ alreadyliked: "User already liked this post" });
          }
          // Add use id to the likes array
          post.likes.unshift({ user: req.user.id });

          // Save to database
          post.save().then(post => res.json(post));
        })
        .catch(err => res.status(404).json({ postnotfound: "No post found" }));
    });
  }
);

// @route     POST api/posts/unlike/:id
// @dsc       Unlike post
// @access    Private
router.post(
  "/unlike/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id)
        .then(post => {
          // Check for post owner
          if (
            post.likes.filter(like => like.user.toString() === req.user.id)
              .length === 0) {
            return res.status(400).json({ notliked: "You have not yet liked this post" });
          }
          // Get the remove index so we know which like to remove
          const removeIndex = post.likes
            .map(item => item.user.toString())
            .indexOf(req.user.id)

          // Splicee out of the array
          post.likes.splice(removeIndex, 1);

          // Save changes
          post.save().then(post => res.json(post));
        })
        .catch(err => res.status(404).json({ postnotfound: "No post found" }));
    });
  }
);

// @route     POST api/posts/comment/:id
// @dsc       Add comment to post
// @access    Private
router.post('/comment/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { errors, isValid } = validatePostInput(req.body);

  // Check validation
  if (!isValid) {
    // If any errors, send 400 with errors object
    return res.status(400).json(errors);
  }

  Post.findById(req.params.id)
    .then(post => {
      const newComment = {
        text: req.body.text,
        name: req.body.name,
        avatar: req.body.avatar,
        user: req.user.id
      }

      // Add to comments array
      post.comments.unshift(newComment);

      // Save comment
      post.save().then(post => res.json(post))
    })
    .catch(err => res.status(404).json({ postnotfound: "No post foumd" }));
});

// @route     DELETE api/posts/comment/:id/:comment_id
// @dsc       Remove comment from post
// @access    Private
router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', { session: false }), (req, res) => {
  Post.findById(req.params.id)
    .then(post => {
      // Check to see if comment exist
      if (post.comments.filter(comment => comment._id.toString() === req.params.comment_id).length === 0) {
        return res.status(404).json({ commentnotfound: "Comment does not exist" });
      }

      // Get remove index
      const removeIndex = post.comments
        .map(item => item._id.toString())
        .indexOf(req.params.comment_id);

      // Splice out of array
      post.comments.splice(removeIndex, 1);

      // Save changes
      post.save().then(post => res.json(post));

    })
    .catch(err => res.status(404).json({ postnotfound: "No post found" }));
});





module.exports = router;
