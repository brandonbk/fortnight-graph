const { paginationResolvers } = require('@limit0/mongoose-graphql-pagination');
const userAttributionFields = require('./user-attribution');
const AnalyticsEvent = require('../../models/analytics/event');
const Placement = require('../../models/placement');
const Publisher = require('../../models/publisher');
const Template = require('../../models/template');
const Topic = require('../../models/topic');

module.exports = {
  /**
   *
   */
  Placement: {
    publisher: placement => Publisher.findById(placement.publisherId),
    topic: placement => Topic.findById(placement.topicId),
    template: placement => Template.findById(placement.templateId),
    metrics: async (placement, { start, end }) => {
      const pipeline = [];
      pipeline.push({
        $match: {
          e: { $in: ['load-js', 'view-js', 'click-js'] },
          pid: placement._id,
          d: { $gte: start, $lte: end },
        },
      });
      pipeline.push({
        $project: {
          pid: 1,
          view: { $cond: [{ $eq: ['$e', 'view-js'] }, 1, 0] },
          click: { $cond: [{ $eq: ['$e', 'click-js'] }, 1, 0] },
          load: { $cond: [{ $eq: ['$e', 'load-js'] }, 1, 0] },
        },
      });
      pipeline.push({
        $group: {
          _id: '$pid',
          loads: { $sum: '$load' },
          views: { $sum: '$view' },
          clicks: { $sum: '$click' },
        },
      });
      pipeline.push({
        $project: {
          _id: 0,
          loads: 1,
          views: 1,
          clicks: 1,
          ctr: {
            $cond: {
              if: {
                $eq: ['$views', 0],
              },
              then: 0,
              else: {
                $divide: ['$clicks', '$views'],
              },
            },
          },
        },
      });

      const result = await AnalyticsEvent.aggregate(pipeline);
      return result[0] ? result[0] : {
        loads: 0,
        views: 0,
        clicks: 0,
        ctr: 0,
      };
    },
    ...userAttributionFields,
  },

  /**
   *
   */
  PlacementConnection: paginationResolvers.connection,

  /**
   *
   */
  Query: {
    /**
     *
     */
    placement: (root, { input }, { auth }) => {
      auth.check();
      const { id } = input;
      return Placement.strictFindActiveById(id);
    },

    /**
     *
     */
    allPlacements: (root, { pagination, sort }, { auth }) => {
      auth.check();
      const criteria = { deleted: false };
      return Placement.paginate({ criteria, pagination, sort });
    },

    /**
     *
     */
    searchPlacements: (root, { pagination, phrase }, { auth }) => {
      auth.check();
      const filter = { term: { deleted: false } };
      return Placement.search(phrase, { pagination, filter });
    },

    /**
     *
     */
    autocompletePlacements: async (root, { pagination, phrase }, { auth }) => {
      auth.check();
      const filter = { term: { deleted: false } };
      return Placement.autocomplete(phrase, { pagination, filter });
    },
  },

  /**
   *
   */
  Mutation: {
    /**
     *
     */
    createPlacement: (root, { input }, { auth }) => {
      auth.check();
      const { payload } = input;
      const {
        name,
        publisherId,
        templateId,
        topicId,
        reservePct,
      } = payload;

      const placement = new Placement({
        name,
        publisherId,
        templateId,
        topicId,
        reservePct,
      });
      placement.setUserContext(auth.user);
      return placement.save();
    },

    /**
     *
     */
    updatePlacement: async (root, { input }, { auth }) => {
      auth.check();
      const { id, payload } = input;
      const placement = await Placement.strictFindActiveById(id);
      const {
        name,
        publisherId,
        templateId,
        topicId,
        reservePct,
      } = payload;
      placement.set({
        name,
        publisherId,
        templateId,
        topicId,
        reservePct,
      });
      placement.setUserContext(auth.user);
      return placement.save();
    },

    /**
     *
     */
    deletePlacement: async (root, { input }, { auth }) => {
      auth.check();
      const { id } = input;
      const placement = await Placement.strictFindActiveById(id);
      placement.setUserContext(auth.user);
      await placement.softDelete();
      return 'ok';
    },
  },
};
