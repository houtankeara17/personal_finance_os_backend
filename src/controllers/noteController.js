const Note = require("../models/Note");
// 1. Import your configured cloudinary file
const cloudinary = require("../config/cloudinary");

// ─── HELPER FUNCTION FOR CHECKLIST ITEMS / IMAGES ───────────────────────────
// Loops through items to upload base64 images if they exist inside checklist items
const processNoteItems = async (itemsArray) => {
  if (!itemsArray || !Array.isArray(itemsArray)) return [];

  const promises = itemsArray.map(async (item) => {
    let updatedItem = { ...item };

    // Check if the item contains a new base64 image property (e.g., item.image)
    if (updatedItem.image && updatedItem.image.startsWith("data:image")) {
      const response = await cloudinary.uploader.upload(updatedItem.image, {
        folder: "note_attachments",
        resource_type: "image",
      });
      updatedItem.image = response.secure_url;
    }
    return updatedItem;
  });

  return Promise.all(promises);
};

// ─── GET /api/notes ──────────────────────────────────────────────────────────
const getNotes = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.categoryTag) filter.categoryTag = req.query.categoryTag;
    if (req.query.color) filter.color = req.query.color;
    if (req.query.pinned !== undefined) {
      filter.pinned = req.query.pinned === "true";
    }

    const notes = await Note.find(filter).sort({
      pinned: -1,
      column: 1,
      position: 1,
    });
    res.json({ success: true, count: notes.length, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/notes/:id ──────────────────────────────────────────────────────
const getNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!note)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    res.json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/notes ─────────────────────────────────────────────────────────
const createNote = async (req, res) => {
  try {
    // FIX: Added 'icon' to destructuring assignment
    const { title, categoryTag, color, pinned, items, column, image, icon } =
      req.body;

    // 2. Upload cover/attachment image for the note itself if provided
    let noteImageUrl = "";
    if (image && image.startsWith("data:image")) {
      const response = await cloudinary.uploader.upload(image, {
        folder: "note_covers",
        resource_type: "image",
      });
      noteImageUrl = response.secure_url;
    } else if (image) {
      noteImageUrl = image; // Handles raw CSS linear-gradients or standard URL links
    }

    // 3. Process nested item images if any checklist items have embedded images
    const updatedItems = await processNoteItems(items);

    // Assign to end of column (max position + 1)
    const lastNote = await Note.findOne({
      userId: req.user._id,
      column: column || 0,
    }).sort({ position: -1 });
    const position = lastNote ? lastNote.position + 1 : 0;

    const note = await Note.create({
      userId: req.user._id,
      title,
      icon: icon || "Notebook", // FIX: Map explicitly into instance instantiation
      categoryTag: categoryTag || "General",
      color: color || "default",
      pinned: pinned || false,
      items: updatedItems,
      image: noteImageUrl,
      position,
      column: column || 0,
    });

    res.status(201).json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/notes/:id ──────────────────────────────────────────────────────
const updateNote = async (req, res) => {
  try {
    // FIX: Destructure incoming 'icon' field variations safely
    const { title, categoryTag, color, pinned, items, image, icon } = req.body;

    // Handle note container image asset updates
    let noteImageUrl = image;
    if (image && image.startsWith("data:image")) {
      const response = await cloudinary.uploader.upload(image, {
        folder: "note_covers",
        resource_type: "image",
      });
      noteImageUrl = response.secure_url;
    }

    // Process updated checklist sub-images
    const updatedItems = await processNoteItems(items);

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        title,
        categoryTag,
        color,
        pinned,
        items: updatedItems,
        image: noteImageUrl,
        icon, // FIX: Bound 'icon' inside mongoose pipeline properties payload
      },
      { new: true, runValidators: true },
    );

    if (!note)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    res.json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/notes/:id/pin ────────────────────────────────────────────────
const togglePin = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!note)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });

    note.pinned = !note.pinned;
    await note.save();

    res.json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/notes/:id/items/:itemId ──────────────────────────────────────
const toggleItem = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!note)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });

    const item = note.items.id(req.params.itemId);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    item.checked = !item.checked;
    await note.save();

    res.json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/notes/reorder ────────────────────────────────────────────────
const reorderNotes = async (req, res) => {
  try {
    const updates = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Updates array required" });
    }

    const ops = updates.map(({ _id, position, column }) => ({
      updateOne: {
        filter: { _id, userId: req.user._id },
        update: {
          $set: { position: Number(position), column: Number(column ?? 0) },
        },
      },
    }));

    const result = await Note.bulkWrite(ops);

    res.json({
      success: true,
      message: `Reordered ${result.modifiedCount} notes`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/notes/:id ───────────────────────────────────────────────────
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!note)
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getNotes,
  getNote,
  createNote,
  updateNote,
  togglePin,
  toggleItem,
  reorderNotes,
  deleteNote,
};
