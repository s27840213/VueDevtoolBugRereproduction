import i18n from '@/i18n'

class HomeBlockData {
  data() {
    return [{
      title: i18n.t('NN0466', { newline: '<br>' }),
      description: i18n.t('NN0467'),
      img: {
        name: 'templateGallery.json',
        width: 3000,
        height: 600
      },
      colorBlock: [
        {
          name: 'oval_lightblue1.svg',
          top: -13,
          left: 17
        }, {
          name: 'oval_pink1.svg',
          top: -13,
          left: 17
        }
      ],
      align: 'column'
    }, {
      title: i18n.t('NN0480', { newline: '<br>' }),
      description: i18n.t('NN0481'),
      img: {
        name: 'remover.mp4',
        width: 500,
        height: 374.48
      },
      colorBlock: [{
        name: 'oval_blue2.svg',
        top: 120,
        left: 297
      }],
      align: 'row'
    }, {
      title: i18n.t('NN0471', { newline: '<br>' }),
      description: i18n.t('NN0472'),
      img: {
        name: 'bundle.json',
        width: 500
      },
      colorBlock: [{
        name: 'vector_blue1.svg',

        top: -11,
        left: -77
      }],
      align: 'alternately'
    }, {
      title: i18n.t('NN0473', { newline: '<br>' }),
      description: i18n.t('NN0474'),
      img: {
        name: 'multiple-sizes.json',
        width: 500
      },
      colorBlock: [{
        name: 'vector_purple1.svg',
        top: -32,
        left: 331
      }],
      align: 'alternately'
    }, {
      title: i18n.t('NN0475', { newline: '<br>' }),
      description: i18n.t('NN0476'),
      link: {
        text: i18n.t('NN0477'),
        to: `/templates?q=${i18n.locale === 'tw' ? '九宮格' : 'storytelling'}`
      },
      img: {
        name: 'storytelling.mp4',
        width: 488,
        height: 520
      },
      colorBlock: [
        {
          name: 'oval_orange2.svg',
          top: -69,
          left: -95
        }, {
          name: 'oval_lightblue2.svg',
          top: -59.25,
          left: -79.07
        }, {
          name: 'oval_brown1.svg',
          top: 33.34,
          left: 8.65
        }
      ],
      align: 'alternately'
    }, {
      title: i18n.t('NN0468', { newline: '<br>' }),
      description: i18n.t('NN0469'),
      link: {
        text: i18n.t('NN0470'),
        to: '/templates'
      },
      img: {
        name: 'business.json',
        width: 500
      },
      colorBlock: [
        {
          name: 'oval_blue1.svg',
          top: -107,
          left: -96
        }, {
          name: 'oval_orange1.svg',
          top: -107,
          left: -96
        }, {
          name: 'oval_pink2.svg',
          ref: 'img',
          top: 351,
          left: 329
        }
      ],
      align: 'alternately'
    }, {
      title: i18n.t('NN0478', { newline: '<br>' }),
      description: i18n.t('NN0479'),
      link: {
        text: i18n.t('NN0477'),
        to: '/templates?themes=7'
      },
      img: {
        name: 'e-commerce.json',
        width: 500
      },
      colorBlock: [{
        name: 'vector_yellow1.svg',
        ref: 'img',
        top: -128,
        left: 0
      }],
      align: 'alternately'
    }, {

      title: i18n.t('NN0482', { newline: '<br>' }),
      description: i18n.t('NN0483'),
      img: {
        name: 'brandkit.json',
        width: 500
      },
      colorBlock: [{
        name: 'vector_orange1.svg',
        top: -64,
        left: -50
      }],
      align: 'alternately'
    }, {
      title: i18n.t('NN0484', { newline: '<br>' }),
      description: i18n.t('NN0485'),
      img: {
        name: 'comment.json',
        width: 2700,
        height: 318
      },
      colorBlock: [
        {
          name: 'oval_lightblue3.svg',
          top: -6,
          left: 331
        }, {
          name: 'oval_pink3.svg',
          top: 48,
          left: 310
        }
      ],
      align: 'column'
    }]
  }
}

export default new HomeBlockData()
